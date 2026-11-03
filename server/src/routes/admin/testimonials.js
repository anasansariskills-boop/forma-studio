import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, fromPrismaError } from '../../lib/errors.js'
import { validate } from '../../middleware/validate.js'
import { recordIdParam, testimonialCreateBody, testimonialUpdateBody } from '../../lib/validation.js'

const router = Router()

router.use(requireAdmin)

const withProject = { project: { select: { id: true, slug: true, title: true } } }

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const search = request.query.search?.trim()
    const where = search
      ? {
          OR: [
            { author: { contains: search, mode: 'insensitive' } },
            { quote: { contains: search, mode: 'insensitive' } },
            { role: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}
    response.json({
      testimonials: await prisma.testimonial.findMany({
        where,
        include: withProject,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    })
  }),
)

router.get(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    const testimonial = await prisma.testimonial.findUnique({ where: { id: request.validParams.id }, include: withProject })
    if (!testimonial) throw ApiError.notFound('That testimonial does not exist.')
    response.json({ testimonial })
  }),
)

router.post(
  '/',
  validate({ body: testimonialCreateBody }),
  asyncHandler(async (request, response) => {
    const testimonial = await prisma.testimonial
      .create({ data: request.body, include: withProject })
      .catch((error) => {
        throw fromPrismaError(error, 'testimonial')
      })
    response.status(201).json({ testimonial })
  }),
)

router.patch(
  '/:id',
  validate({ params: recordIdParam, body: testimonialUpdateBody }),
  asyncHandler(async (request, response) => {
    const testimonial = await prisma.testimonial
      .update({ where: { id: request.validParams.id }, data: request.body, include: withProject })
      .catch((error) => {
        throw fromPrismaError(error, 'testimonial')
      })
    response.json({ testimonial })
  }),
)

router.delete(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    await prisma.testimonial
      .delete({ where: { id: request.validParams.id } })
      .catch((error) => {
        throw fromPrismaError(error, 'testimonial')
      })
    response.json({ ok: true, id: request.validParams.id })
  }),
)

export default router
