import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { ApiError, asyncHandler } from '../lib/errors.js'
import { validate } from '../middleware/validate.js'
import { projectListQuery, publicProjectSlug } from '../lib/validation.js'

const router = Router()

const cardFields = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  status: true,
  location: true,
  country: true,
  year: true,
  areaSqm: true,
  coverImageUrl: true,
  coverImageAlt: true,
  featured: true,
  tags: true,
  sortOrder: true,
  published: true,
  createdAt: true,
}

const orderFor = {
  manual: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  recent: [{ year: 'desc' }, { createdAt: 'desc' }],
  oldest: [{ year: 'asc' }, { createdAt: 'asc' }],
  title: [{ title: 'asc' }],
}

/** Published content only — the site never sees drafts. */
router.get(
  '/projects',
  validate({ query: projectListQuery }),
  asyncHandler(async (request, response) => {
    const { category, status, featured, search, sort, page, perPage } = request.validQuery
    const where = {
      published: true,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(featured === undefined ? {} : { featured }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
              { excerpt: { contains: search, mode: 'insensitive' } },
              { tags: { has: search.toLowerCase() } },
            ],
          }
        : {}),
    }

    const [total, projects, grouped] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({ where, select: cardFields, orderBy: orderFor[sort], skip: (page - 1) * perPage, take: perPage }),
      prisma.project.groupBy({ by: ['category'], where: { published: true }, _count: { _all: true } }),
    ])

    response.json({
      projects,
      pagination: { page, perPage, total, pages: Math.max(1, Math.ceil(total / perPage)) },
      categories: Object.fromEntries(grouped.map((row) => [row.category, row._count._all])),
    })
  }),
)

router.get(
  '/projects/:slug',
  validate({ params: publicProjectSlug }),
  asyncHandler(async (request, response) => {
    const { slug } = request.validParams
    const project = await prisma.project.findFirst({
      where: { slug, published: true },
      select: {
        ...cardFields,
        description: true,
        client: true,
        materials: true,
        images: { orderBy: [{ sortOrder: 'asc' }] },
        testimonials: {
          where: { published: true },
          select: { id: true, quote: true, author: true, role: true, company: true },
        },
      },
    })
    if (!project) throw ApiError.notFound('That project has not been published yet.')

    const siblings = await prisma.project.findMany({
      where: { published: true, NOT: { id: project.id } },
      select: { slug: true, title: true, coverImageUrl: true, category: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    const list = [{ slug: project.slug, title: project.title, coverImageUrl: project.coverImageUrl, category: project.category }, ...siblings]
    const index = list.findIndex((entry) => entry.slug === slug)

    response.json({
      project,
      navigation: {
        previous: index > 0 ? list[index - 1] : list[list.length - 1],
        next: index < list.length - 1 ? list[index + 1] : list[0],
      },
    })
  }),
)

router.get(
  '/services',
  asyncHandler(async (_request, response) => {
    const services = await prisma.service.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }] })
    response.json({ services })
  }),
)

router.get(
  '/testimonials',
  asyncHandler(async (request, response) => {
    const featured = request.query.featured === 'true'
    const testimonials = await prisma.testimonial.findMany({
      where: { published: true, ...(featured ? { featured: true } : {}) },
      select: {
        id: true,
        quote: true,
        author: true,
        role: true,
        company: true,
        rating: true,
        featured: true,
        project: { select: { slug: true, title: true } },
      },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 24,
    })
    response.json({ testimonials })
  }),
)

router.get(
  '/team',
  asyncHandler(async (_request, response) => {
    const team = await prisma.teamMember.findMany({ where: { published: true }, orderBy: [{ sortOrder: 'asc' }] })
    response.json({ team })
  }),
)

/** Everything the chrome (header, footer, contact block) needs in one round trip. */
router.get(
  '/site',
  asyncHandler(async (_request, response) => {
    const [studio, counts] = await Promise.all([
      prisma.studioProfile.findUnique({ where: { id: 'default' } }),
      prisma.project.groupBy({ by: ['category'], where: { published: true }, _count: { _all: true } }),
    ])
    if (!studio) throw ApiError.notFound('The studio profile has not been configured.')

    const byCategory = Object.fromEntries(counts.map((row) => [row.category, row._count._all]))
    response.json({
      studio,
      portfolio: {
        total: Object.values(byCategory).reduce((total, value) => total + value, 0),
        byCategory,
      },
    })
  }),
)

export default router
