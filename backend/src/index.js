const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()

app.use(
  cors({
    origin: ['https://docu-mind-neon.vercel.app', 'http://localhost:3000'],
    credentials: true,
  }),
)
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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected')
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
  })
