const { z } = require('zod')

// Password rule: at least 8 chars, must contain a letter AND a digit.
// Kept deliberately simple — overly strict rules push users toward password reuse.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(254).toLowerCase().trim(),
  password: passwordSchema,
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(254).toLowerCase().trim(),
  // Login does not enforce password rules — they may be checking an old password
  // that predates the current rules. Just bound the length.
  password: z.string().min(1).max(128),
})

const chatSchema = z.object({
  documentId: z.string().min(1, 'documentId is required'),
  question: z.string().min(1, 'question is required').max(2000, 'Question is too long'),
})

// Express middleware: validates req.body against a zod schema and replaces it
// with the parsed (and normalised) result. On failure returns 400 with the
// first error message — terse on purpose, since the frontend already does
// inline validation.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const firstError = result.error.errors[0]
      return res.status(400).json({ message: firstError.message })
    }
    req.body = result.data
    next()
  }
}

module.exports = { validate, registerSchema, loginSchema, chatSchema }
