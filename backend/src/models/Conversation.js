const mongoose = require('mongoose')

/**
 * Conversation model — stores chat history between a user and a document
 * Each conversation belongs to one user and one document
 * Messages are stored as an array inside the conversation
 */
const conversationSchema = new mongoose.Schema(
  {
    // The user who owns this conversation
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The document this conversation is about
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    // Array of messages — each message is either from the user or the AI
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        // Source citations returned with AI responses
        sources: [
          {
            content: String,
            metadata: mongoose.Schema.Types.Mixed,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
)

// Each (userId, documentId) pair has at most one conversation, and every
// chat request looks it up by exactly that pair. Unique compound index gives
// us both fast lookups and a DB-level guarantee against duplicates from a
// race between two concurrent first-message requests.
conversationSchema.index({ userId: 1, documentId: 1 }, { unique: true })

module.exports = mongoose.model('Conversation', conversationSchema)
