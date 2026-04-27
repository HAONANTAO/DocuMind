const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()

// Trust the first proxy (Render/Vercel/etc.) so req.ip reflects the real
// client address — required for rate limiting to key off the actual user.
app.set('trust proxy', 1)

app.use(helmet())

// CORS: in production the allow-list MUST be set explicitly. Falling back to
// '*' would let any origin call the API with credentials, which is a security
// hole. In development we accept localhost without configuration to keep the
// dev loop friction-free.
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGIN must be set in production')
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin or curl/server-to-server requests have no Origin header
      if (!origin) return cb(null, true)
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
        return cb(null, true)
      }
      if (allowedOrigins.includes(origin)) return cb(null, true)
      // Silently deny — omitting the Access-Control-Allow-Origin header is
      // sufficient (the browser blocks the response). Throwing here would
      // surface as a 500 in our logs and obscure real errors.
      return cb(null, false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
const authRoutes = require('./routes/auth')
app.use('/api/auth', authRoutes)

const documentRoutes = require('./routes/documents')
app.use('/api/documents', documentRoutes)

const chatRoutes = require('./routes/chat')
app.use('/api/chat', chatRoutes)
app.get('/', (req, res) => {
  res.json({ message: 'DocuMind API is running' })
})

const Document = require('./models/Document')

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected')

    // Any document stuck in 'uploading' or 'processing' means the server
    // restarted mid-pipeline. Mark them as errors so users know to re-upload.
    const { modifiedCount } = await Document.updateMany(
      { status: { $in: ['uploading', 'processing'] } },
      { status: 'error', errorMessage: 'Server restarted during processing — please re-upload.' },
    )
    if (modifiedCount > 0) {
      console.log(`⚠️  Marked ${modifiedCount} stuck document(s) as error`)
    }

    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
  })
