const express = require('express')
const multer = require('multer')
const Document = require('../models/Document')
const auth = require('../middleware/auth')
const { processDocument } = require('../config/documentProcessor')

const router = express.Router()

/**
 * Configure multer for file uploads
 * memoryStorage stores the file in memory as a Buffer
 * instead of saving it to disk — we only need it temporarily
 * to process and vectorize, then we discard it
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
 * Upload and process a PDF document
 *
 * Flow:
 * 1. Save document metadata to MongoDB with status "uploading"
 * 2. Trigger async processing (PDF → chunks → vectors → Pinecone)
 * 3. Update status to "ready" when done, or "error" if it fails
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' })
    }

    // Step 1: Save document metadata to MongoDB
    const document = await Document.create({
      userId: req.userId,
      fileName: req.file.originalname,
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
        // If anything fails, mark as error
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
 * Delete a document from MongoDB
 * TODO: Also delete vectors from Pinecone
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

    await document.deleteOne()
    res.json({ message: 'Document deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router
