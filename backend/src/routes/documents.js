const express = require('express')
const multer = require('multer')
const Document = require('../models/Document')
const auth = require('../middleware/auth')
const { processDocument } = require('../config/documentProcessor')
const { getPineconeIndex } = require('../config/rag')

const router = express.Router()

/**
 * Multer middleware — handles multipart/form-data file uploads.
 *
 * memoryStorage keeps the file in a Buffer on req.file.buffer rather
 * than writing it to disk. This makes the server stateless: any instance
 * can handle any upload without needing a shared filesystem.
 *
 * Limits:
 *   - 20 MB max file size (large PDFs can exceed OpenAI embedding limits per request)
 *   - PDF MIME type only (other types are not yet supported by the parser)
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'), false)
    }
  },
})

/**
 * POST /api/documents/upload
 * Upload a PDF and kick off async RAG indexing.
 *
 * The response is returned immediately (status 201) so the user never
 * waits for the embedding pipeline to finish. The frontend polls
 * GET /api/documents until the status field changes to "ready".
 *
 * Status lifecycle:  uploading → processing → ready | error
 *
 * Note on filename encoding: HTTP multipart headers are transmitted as
 * latin1 by default. Non-ASCII filenames (e.g. Chinese characters) must
 * be re-decoded from latin1 → utf8 to display correctly.
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' })
    }

    // Step 1: Save document metadata to MongoDB
    const document = await Document.create({
      userId: req.userId,
      fileName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      fileSize: req.file.size,
      status: 'uploading',
    })

    // Step 2: Return immediately so the user doesn't wait
    // Processing happens in the background
    res.status(201).json({
      message: 'File uploaded, processing started',
      document,
    })

    // Step 3: Process the document asynchronously
    // We don't await this — it runs in the background
    ;(async () => {
      try {
        // Update status to "processing"
        await Document.findByIdAndUpdate(document._id, { status: 'processing' })

        // Run the full RAG pipeline: PDF → text → chunks → vectors → Pinecone
        const chunkCount = await processDocument(
          req.file.buffer,
          document._id,
          req.userId,
        )

        // Update status to "ready" when done
        await Document.findByIdAndUpdate(document._id, {
          status: 'ready',
          chunkCount,
        })
      } catch (err) {
        console.error('❌ Document processing error:', err)
        await Document.findByIdAndUpdate(document._id, {
          status: 'error',
          errorMessage: err.message,
        })
      }
    })()
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * GET /api/documents
 * Get all documents for the logged-in user
 */
router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.userId }).sort({
      createdAt: -1,
    }) // Most recent first
    res.json(documents)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * DELETE /api/documents/:id
 * Hard-delete a document: removes the MongoDB record AND all associated
 * Pinecone vectors so storage is fully reclaimed.
 *
 * The userId check on findOne prevents users from deleting each other's
 * documents even if they know a valid document ID.
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.userId, // Ensure users can only delete their own documents
    })

    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }

    // Delete from MongoDB first — this must always succeed
    await document.deleteOne()

    // Delete all vectors for this document from Pinecone.
    // Wrapped in its own try-catch: a Pinecone failure should not cause the
    // overall request to fail (the document is already gone from MongoDB).
    try {
      const pineconeIndex = getPineconeIndex()
      // Use the native Pinecone SDK to delete by metadata filter.
      // LangChain's PineconeStore.delete() only accepts { ids } or { deleteAll },
      // not { filter }, so we bypass it here.
      await pineconeIndex
        .namespace(`user_${req.userId}`)
        .deleteMany({ documentId: document._id.toString() })
    } catch (pineconeErr) {
      console.warn('⚠️  Pinecone vector cleanup failed (non-critical):', pineconeErr.message)
    }

    res.json({ message: 'Document deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router
