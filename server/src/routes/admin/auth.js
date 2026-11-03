import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler } from '../../lib/errors.js'
import { hashPassword, signToken, verifyPassword } from '../../lib/auth.js'
import { validate } from '../../middleware/validate.js'
import { loginBody } from '../../lib/validation.js'
import { authLimiter } from '../../middleware/rate-limit.js'

const passwordBody = z.object({
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(10).max(200),
})

const router = Router()

router.post(
  '/login',
  authLimiter,
  validate({ body: loginBody }),
  asyncHandler(async (request, response) => {
    const { email, password } = request.body
    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } })

    // Compare against a dummy hash when the account is unknown so that the
    // response time does not reveal which addresses exist.
    const hash = admin?.passwordHash ?? '$2a$12$8U8U8U8U8U8U8U8U8U8U8uK7GZ6Yw2wq0mS0jF3vQxq1nGq2JZ3YO'
    const matches = await verifyPassword(password, hash)
    if (!admin || !matches) throw ApiError.unauthorized('That email and password do not match.')

    const updated = await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
      select: { id: true, email: true, name: true, role: true, lastLoginAt: true },
    })

    response.json({ token: signToken(admin), admin: updated })
  }),
)

router.get(
  '/session',
  requireAdmin,
  asyncHandler(async (request, response) => {
    response.json({ admin: request.admin })
  }),
)

router.post(
  '/password',
  requireAdmin,
  validate({ body: passwordBody }),
  asyncHandler(async (request, response) => {
    const { currentPassword, newPassword } = request.body
    const admin = await prisma.adminUser.findUnique({ where: { id: request.admin.id } })
    if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      throw ApiError.badRequest('Your current password is not correct.')
    }
    await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(newPassword) } })
    response.json({ ok: true, message: 'Password updated.' })
  }),
)

export default router
