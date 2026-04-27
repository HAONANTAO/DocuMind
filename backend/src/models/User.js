const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro'],
      default: 'free',
    },
  },
  { timestamps: true },
)

// `unique: true` on email already creates a unique index. No additional
// indexes are needed on this small collection.

module.exports = mongoose.model('User', userSchema)
