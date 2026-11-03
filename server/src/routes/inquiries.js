import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler, fromPrismaError } from '../lib/errors.js'
import { validate } from '../middleware/validate.js'
import { inquiryCreateBody } from '../lib/validation.js'
import { contactLimiter } from '../middleware/rate-limit.js'

const router = Router()

const SOURCES = new Set(['website', 'home', 'project', 'services', 'about', 'footer'])

/**
 * Public intake. A filled `company` field means a bot: we return the same
 * success shape without storing anything, so the honeypot stays invisible.
 */
router.post(
  '/inquiries',
  contactLimiter,
  validate({ body: inquiryCreateBody }),
  asyncHandler(async (request, response) => {
    const { company, ...data } = request.body
    if (company) {
      response.status(201).json({ ok: true, id: 'queued', message: 'Thanks — we have received your enquiry.' })
      return
    }

    const header = String(request.get('x-inquiry-source') ?? '').toLowerCase()
    const inquiry = await prisma.contactInquiry.create({
      data: { ...data, source: SOURCES.has(header) ? header : 'website' },
      select: { id: true, createdAt: true },
    })

    response.status(201).json({
      ok: true,
      id: inquiry.id,
      message: 'Thank you. Your enquiry is with the studio — we answer within two working days.',
    })
  }),
)

export default router
