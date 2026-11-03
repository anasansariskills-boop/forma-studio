import rateLimit from 'express-rate-limit'
import { config } from '../config.js'

const shared = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Behind Render/Railway/Fly the real client IP arrives in X-Forwarded-For.
  ...(config.isProduction ? { trustProxy: true } : {}),
  handler: (_request, response) => {
    response.status(429).json({ error: { status: 429, message: 'Too many attempts — please wait a few minutes.' } })
  },
}

export const contactLimiter = rateLimit({ ...shared, windowMs: 15 * 60 * 1000, limit: 8 })

export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: (_request, response) => {
    response.status(429).json({ error: { status: 429, message: 'Too many sign-in attempts. Wait a moment and try again.' } })
  },
})
