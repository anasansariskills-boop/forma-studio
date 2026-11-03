import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { prisma } from '../../lib/prisma.js'
import { asyncHandler } from '../../lib/errors.js'

const router = Router()

router.use(requireAdmin)

const DAY = 24 * 60 * 60 * 1000

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

/** The last `count` calendar months, oldest first. */
function monthBuckets(count) {
  const cursor = new Date()
  const buckets = []
  for (let index = 0; index < count; index += 1) {
    buckets.unshift({ label: monthKey(cursor), value: 0 })
    cursor.setMonth(cursor.getMonth() - 1)
  }
  return buckets
}

/** The last `count` days, oldest first, labelled ISO-8601. */
function dayBuckets(count) {
  return Array.from({ length: count }, (_, index) => ({
    label: new Date(Date.now() - (count - 1 - index) * DAY).toISOString().slice(0, 10),
    value: 0,
  }))
}

router.get(
  '/overview',
  asyncHandler(async (_request, response) => {
    const now = Date.now()
    const since7 = new Date(now - 7 * DAY)
    const since30 = new Date(now - 30 * DAY)
    const sinceYear = new Date(now - 365 * DAY)

    const [
      projects,
      publishedProjects,
      featuredProjects,
      draftProjects,
      images,
      services,
      publishedServices,
      testimonials,
      team,
      inquiries,
      newInquiries,
      weekInquiries,
      repliedInquiries,
      byCategory,
      byType,
      byStatus,
      recentInquiries,
      recentProjects,
      monthRows,
      dayRows,
      lastLogin,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { published: true } }),
      prisma.project.count({ where: { featured: true } }),
      prisma.project.count({ where: { published: false } }),
      prisma.projectImage.count(),
      prisma.service.count(),
      prisma.service.count({ where: { published: true } }),
      prisma.testimonial.count(),
      prisma.teamMember.count(),
      prisma.contactInquiry.count(),
      prisma.contactInquiry.count({ where: { status: 'NEW' } }),
      prisma.contactInquiry.count({ where: { createdAt: { gte: since7 } } }),
      prisma.contactInquiry.count({ where: { status: { in: ['REPLIED', 'ARCHIVED'] } } }),
      prisma.project.groupBy({ by: ['category'], _count: { _all: true }, orderBy: { category: 'asc' } }),
      prisma.contactInquiry.groupBy({ by: ['projectType'], _count: { _all: true }, orderBy: { projectType: 'asc' } }),
      prisma.contactInquiry.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
      prisma.contactInquiry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, name: true, email: true, projectType: true, status: true, createdAt: true },
      }),
      prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, status: true, published: true, updatedAt: true, coverImageUrl: true },
      }),
      prisma.contactInquiry.findMany({ where: { createdAt: { gte: sinceYear } }, select: { createdAt: true } }),
      prisma.contactInquiry.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
      prisma.adminUser.findMany({ orderBy: { lastLoginAt: 'desc' }, take: 1, select: { name: true, lastLoginAt: true } }),
    ])

    const monthly = monthBuckets(12)
    const monthTotals = new Map(monthly.map((bucket) => [bucket.label, bucket]))
    for (const row of monthRows) {
      const bucket = monthTotals.get(monthKey(row.createdAt))
      if (bucket) bucket.value += 1
    }

    const daily = dayBuckets(30)
    const dailyIndex = new Map(daily.map((bucket, position) => [bucket.label, position]))
    for (const row of dayRows) {
      const position = dailyIndex.get(row.createdAt.toISOString().slice(0, 10))
      if (position !== undefined) daily[position].value += 1
    }

    response.json({
      totals: {
        projects,
        publishedProjects,
        draftProjects,
        featuredProjects,
        images,
        services,
        publishedServices,
        testimonials,
        team,
        inquiries,
        newInquiries,
        weekInquiries,
        repliedInquiries,
        replyRate: inquiries ? Math.round((repliedInquiries / inquiries) * 100) : 0,
      },
      portfolio: byCategory.map((row) => ({ category: row.category, count: row._count._all })),
      demand: byType.map((row) => ({ projectType: row.projectType, count: row._count._all })),
      pipeline: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
      series: { daily, monthly },
      recent: { inquiries: recentInquiries, projects: recentProjects },
      admin: lastLogin[0] ?? null,
    })
  }),
)

export default router
