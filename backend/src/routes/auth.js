const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Document = require('../models/Document')
const Conversation = require('../models/Conversation')
const auth = require('../middleware/auth')

const router = express.Router()

/**
 * POST /api/auth/register
 * Create a new user account.
 *
 * - Rejects duplicate emails before hashing (fast path)
 * - Hashes password with bcrypt at cost factor 10
 * - Returns a signed JWT valid for 7 days alongside the new user object
 *
 * @param {string} req.body.email
 * @param {string} req.body.password - Plain-text; never stored
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body

    // Reject duplicate accounts before doing any expensive work
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // bcrypt cost factor 10 — ~100ms on modern hardware, impractical to brute-force
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await User.create({ email, passwordHash })

    // Sign a JWT containing only userId — keeps the payload small
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, plan: user.plan },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * POST /api/auth/login
 * Authenticate an existing user and return a JWT.
 *
 * - Returns the same vague error for missing user AND wrong password
 *   to prevent user-enumeration attacks
 *
 * @param {string} req.body.email
 * @param {string} req.body.password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    // Deliberate: same message for "no such user" and "wrong password"
    // so attackers cannot enumerate registered emails
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.json({
      token,
      user: { id: user._id, email: user.email, plan: user.plan },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 * Requires a valid JWT in the Authorization header.
 * The passwordHash field is stripped from the response.
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash')
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

/**
 * GET /api/auth/usage
 * Return the current user's plan usage stats for display in the UI.
 */
router.get('/usage', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)

    const DOC_LIMIT = { free: 2, pro: Infinity }
    const QUESTION_LIMIT = { free: 10, pro: Infinity }

    const docCount = await Document.countDocuments({ userId: req.userId })

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const conversations = await Conversation.find({ userId: req.userId })
    let weeklyQuestions = 0
    for (const conv of conversations) {
      weeklyQuestions += conv.messages.filter(
        (m) => m.role === 'user' && new Date(m.createdAt) > oneWeekAgo,
      ).length
    }

    res.json({
      plan: user.plan,
      docs: { used: docCount, limit: DOC_LIMIT[user.plan] },
      questions: { used: weeklyQuestions, limit: QUESTION_LIMIT[user.plan] },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router
