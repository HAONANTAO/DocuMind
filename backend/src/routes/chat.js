const express = require('express')
const { HumanMessage, AIMessage } = require('@langchain/core/messages')
const auth = require('../middleware/auth')
const Document = require('../models/Document')
const Conversation = require('../models/Conversation')
const { ragQuery } = require('../config/retriever')

const router = express.Router()

/**
 * POST /api/chat
 * Send a message and get an AI response based on the document
 * Uses Server-Sent Events (SSE) for streaming — the AI responds
 * token by token so the frontend can show a typewriter effect
 *
 * SSE works by keeping the HTTP connection open and sending
 * small chunks of data as they become available
 */
router.post('/', auth, async (req, res) => {
  try {
    const { documentId, question } = req.body

    if (!documentId || !question) {
      return res
        .status(400)
        .json({ message: 'documentId and question are required' })
    }

    // Make sure the document exists and belongs to this user
    const document = await Document.findOne({
      _id: documentId,
      userId: req.userId,
      status: 'ready', // Only allow querying documents that are fully processed
    })

    if (!document) {
      return res
        .status(404)
        .json({ message: 'Document not found or not ready' })
    }

    // Find or create a conversation for this user + document pair
    let conversation = await Conversation.findOne({
      userId: req.userId,
      documentId,
    })

    if (!conversation) {
      conversation = await Conversation.create({
        userId: req.userId,
        documentId,
        messages: [],
      })
    }

    // Build chat history for multi-turn conversation
    // Convert stored messages to LangChain message format
    const chatHistory = conversation.messages.slice(-6).map((msg) => {
      // Only use the last 6 messages to keep the context window manageable
      return msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    })

    // Set up SSE headers — this keeps the connection open for streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let fullAnswer = ''
    let sources = []

    // Run the RAG query and stream tokens to the client
    const result = await ragQuery(
      question,
      documentId,
      req.userId,
      chatHistory,
      (token) => {
        // Every time the AI generates a token, send it to the frontend
        res.write(`data: ${JSON.stringify({ token })}\n\n`)
        fullAnswer += token
      },
    )

    sources = result.sources

    // Send the sources after the answer is complete
    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`)
    res.end()

    // Save both the user question and AI answer to conversation history
    conversation.messages.push(
      { role: 'user', content: question },
      { role: 'assistant', content: fullAnswer, sources },
    )
    await conversation.save()
  } catch (err) {
    console.error('❌ Chat error:', err)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * GET /api/chat/:documentId/history
 * Get the full conversation history for a document
 */
router.get('/:documentId/history', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      userId: req.userId,
      documentId: req.params.documentId,
    })

    if (!conversation) {
      return res.json({ messages: [] })
    }

    res.json({ messages: conversation.messages })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router
