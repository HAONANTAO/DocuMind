const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: '没有提供Token，访问被拒绝' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (err) {
    res.status(401).json({ message: 'Token无效或已过期' })
  }
}

module.exports = auth
