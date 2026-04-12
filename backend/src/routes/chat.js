const express = require('express')
const { HumanMessage, AIMessage } = require('@langchain/core/messages')
const auth = require('../middleware/auth')
const Document = require('../models/Document')
const Conversation = require('../models/Conversation')
const { ragQuery } = require('../config/retriever')

const router = express.Router()

/**
 * POST /api/chat
 * Send a question and stream the AI answer back using Server-Sent Events (SSE).
 *
 * SSE keeps the HTTP connection open so the server can push data incrementally.
 * The frontend reads the stream token-by-token and appends each one to the
 * message bubble, creating a typewriter effect without polling.
 *
 * Event format (newline-delimited):
 *   data: {"token": "Hello"}        ← one token per event during generation
 *   data: {"done": true, "sources": [...]}  ← final event with citations
 *
 * @param {string} req.body.documentId - The document to query
 * @param {string} req.body.question   - The user's natural-language question
 */
router.post('/', auth, async (req, res) => {
  try {
    const { documentId, question } = req.body

    if (!documentId || !question) {
      return res
        .status(400)
        .json({ message: 'documentId and question are required' })
    }

    // Verify the document exists, belongs to this user, and is fully indexed.
    // status: 'ready' means all chunks have been embedded and stored in Pinecone.
    const document = await Document.findOne({
      _id: documentId,
      userId: req.userId,
      status: 'ready',
    })

    if (!document) {
      return res
        .status(404)
        .json({ message: 'Document not found or not ready' })
    }

    // One conversation document per (userId, documentId) pair.
    // Created lazily on the first message so there is no empty conversation overhead.
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

    // Pass the last 6 messages as context so the AI can handle follow-up questions.
    // Capping at 6 keeps the prompt within a predictable token budget.
    const chatHistory = conversation.messages.slice(-6).map((msg) =>
      msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content),
    )

    // Switch the response to SSE mode.
    // After these headers are sent, the connection stays open until res.end().
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let fullAnswer = ''
    let sources = []

    // ragQuery calls the onToken callback for every token the LLM produces.
    // We immediately write each token as an SSE event so the frontend can
    // display it without waiting for the full response.
    const result = await ragQuery(
      question,
      documentId,
      req.userId,
      chatHistory,
      (token) => {
        res.write(`data: ${JSON.stringify({ token })}\n\n`)
        fullAnswer += token
      },
    )

    sources = result.sources

    // Signal completion and send source citations in the final event
    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`)
    res.end()

    // Persist the exchange to MongoDB after the stream closes.
    // This happens after res.end() so it never delays the client.
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
