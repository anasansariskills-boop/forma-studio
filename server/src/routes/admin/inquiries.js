import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, fromPrismaError } from '../../lib/errors.js'
import { validate } from '../../middleware/validate.js'
import { inquiryListQuery, inquiryUpdateBody, recordIdParam } from '../../lib/validation.js'

const router = Router()

router.use(requireAdmin)

router.get(
  '/',
  validate({ query: inquiryListQuery }),
  asyncHandler(async (request, response) => {
    const { status, search, page, perPage } = request.validQuery
    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [total, inquiries, grouped] = await Promise.all([
      prisma.contactInquiry.count({ where }),
      prisma.contactInquiry.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          projectType: true,
          budget: true,
          timeline: true,
          location: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          message: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.contactInquiry.groupBy({ by: ['status'], _count: { _all: true } }),
    ])

    const byStatus = Object.fromEntries(grouped.map((row) => [row.status, row._count._all]))
    response.json({
      inquiries: inquiries.map(({ message, ...row }) => ({ ...row, excerpt: message.slice(0, 180), truncated: message.length > 180 })),
      counts: { ...byStatus, ALL: Object.values(byStatus).reduce((total, value) => total + value, 0) },
      pagination: { page, perPage, total, pages: Math.max(1, Math.ceil(total / perPage)) },
    })
  }),
)

router.get(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    const inquiry = await prisma.contactInquiry.findUnique({ where: { id: request.validParams.id } })
    if (!inquiry) throw ApiError.notFound('That enquiry does not exist.')

    // Opening an enquiry from the list moves NEW to READ, but never overwrites
    // a status the team has already set.
    const updated =
      inquiry.status === 'NEW'
        ? await prisma.contactInquiry.update({ where: { id: inquiry.id }, data: { status: 'READ' } })
        : inquiry

    response.json({ inquiry: updated })
  }),
)

router.patch(
  '/:id',
  validate({ params: recordIdParam, body: inquiryUpdateBody }),
  asyncHandler(async (request, response) => {
    const inquiry = await prisma.contactInquiry
      .update({ where: { id: request.validParams.id }, data: request.body })
      .catch((error) => {
        throw fromPrismaError(error, 'enquiry')
      })
    response.json({ inquiry })
  }),
)

router.delete(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    await prisma.contactInquiry
      .delete({ where: { id: request.validParams.id } })
      .catch((error) => {
        throw fromPrismaError(error, 'enquiry')
      })
    response.json({ ok: true, id: request.validParams.id })
  }),
)

export default router
