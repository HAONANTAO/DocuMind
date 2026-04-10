const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已被注册' })
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await User.create({ email, passwordHash })

    // 生成Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, plan: user.plan },
    })
  } catch (err) {
    res.status(500).json({ message: '服务器错误', error: err.message })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // 查找用户
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: '邮箱或密码错误' })
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(400).json({ message: '邮箱或密码错误' })
    }

    // 生成Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.json({
      token,
      user: { id: user._id, email: user.email, plan: user.plan },
    })
  } catch (err) {
    res.status(500).json({ message: '服务器错误', error: err.message })
  }
})
const auth = require('../middleware/auth')

// 测试受保护接口
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('-passwordHash')
  res.json(user)
})
module.exports = router
