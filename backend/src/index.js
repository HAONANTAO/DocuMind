const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true,
}))
app.use(express.json())
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
