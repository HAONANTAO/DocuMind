const { rateLimit, ipKeyGenerator } = require('express-rate-limit')

// Strict limiter for auth endpoints — protects login/register from brute-force
// 10 attempts per 15 min per IP. The 429 response uses the same vague wording
// as the auth error so attackers cannot tell whether they hit the limit
// because of bad credentials or because they were throttled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
})

// Per-user limiter for the chat endpoint — caps OpenAI cost exposure if a
// single account is compromised or scripted. 30 requests per minute is well
// above normal human use but blocks runaway loops.
// Keyed by userId (set by auth middleware) instead of IP, so users behind a
// shared NAT do not throttle each other.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // Prefer per-user keying so users behind a shared NAT do not throttle each
  // other. Falls back to ipKeyGenerator (IPv6-safe) for unauthenticated paths.
  keyGenerator: (req, res) => req.userId || ipKeyGenerator(req, res),
  message: { message: 'Too many requests. Please slow down.' },
})

module.exports = { authLimiter, chatLimiter }
