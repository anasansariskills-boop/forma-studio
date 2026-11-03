import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, fromPrismaError } from '../../lib/errors.js'
import { validate } from '../../middleware/validate.js'
import { recordIdParam, repositionBody, serviceCreateBody, serviceUpdateBody } from '../../lib/validation.js'
import { uniqueSlug } from '../../lib/slugs.js'

const router = Router()

router.use(requireAdmin)

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    response.json({ services: await prisma.service.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }) })
  }),
)

router.get(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    const service = await prisma.service.findUnique({ where: { id: request.validParams.id } })
    if (!service) throw ApiError.notFound('That service does not exist.')
    response.json({ service })
  }),
)

router.post(
  '/',
  validate({ body: serviceCreateBody }),
  asyncHandler(async (request, response) => {
    const data = request.body
    const slug = data.slug ? await uniqueSlug(prisma.service, 'slug', data.slug) : await uniqueSlug(prisma.service, 'slug', data.title)
    const service = await prisma.service
      .create({ data: { ...data, slug } })
      .catch((error) => {
        throw fromPrismaError(error, 'service')
      })
    response.status(201).json({ service })
  }),
)

router.patch(
  '/:id',
  validate({ params: recordIdParam, body: serviceUpdateBody }),
  asyncHandler(async (request, response) => {
    const { id } = request.validParams
    const { slug, ...rest } = request.body
    const service = await prisma.service
      .update({
        where: { id },
        data: { ...rest, ...(slug ? { slug: await uniqueSlug(prisma.service, 'slug', slug, { excludeId: id }) } : {}) },
      })
      .catch((error) => {
        throw fromPrismaError(error, 'service')
      })
    response.json({ service })
  }),
)

router.delete(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    await prisma.service
      .delete({ where: { id: request.validParams.id } })
      .catch((error) => {
        throw fromPrismaError(error, 'service')
      })
    response.json({ ok: true, id: request.validParams.id })
  }),
)

router.patch(
  '/order/reposition',
  validate({ body: repositionBody }),
  asyncHandler(async (request, response) => {
    const { ids } = request.body
    const owned = await prisma.service.count({ where: { id: { in: ids } } })
    if (owned !== ids.length) throw ApiError.badRequest('That service list does not match the database.')
    await prisma.$transaction(ids.map((id, index) => prisma.service.update({ where: { id }, data: { sortOrder: index } })))
    response.json({ services: await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } }) })
  }),
)

router.use(requireAdmin)
export default router
