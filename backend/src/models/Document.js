const mongoose = require('mongoose')

/**
 * Document model — stores metadata about uploaded PDF files
 * The actual content is stored as vectors in Pinecone
 * MongoDB only holds the file info and processing status
 */
const documentSchema = new mongoose.Schema(
  {
    // Reference to the user who uploaded this document
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Original file name shown in the UI
    fileName: {
      type: String,
      required: true,
    },
    // File size in bytes
    fileSize: {
      type: Number,
      required: true,
    },
    // Processing status — updated as the document moves through the pipeline
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'error'],
      default: 'uploading',
    },
    // Number of chunks created during processing
    chunkCount: {
      type: Number,
      default: 0,
    },
    // Error message if processing fails
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
)

// Speeds up the document list query (find by user, newest first), which is
// run on every dashboard load and on every chat request (count for free-tier
// limit check).
documentSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Document', documentSchema)
