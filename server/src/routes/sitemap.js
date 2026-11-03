import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'
import { asyncHandler } from '../lib/errors.js'

const router = Router()

const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/projects', priority: '0.9', changefreq: 'weekly' },
  { path: '/services', priority: '0.8', changefreq: 'monthly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'yearly' },
]

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (character) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character],
  )
}

function absoluteSiteUrl(request) {
  if (config.publicBaseUrl) return config.publicBaseUrl
  // Behind a reverse proxy the real origin only survives in these headers.
  const host = request.get('x-forwarded-host') || request.get('host') || `localhost:${config.port}`
  const protocol = request.get('x-forwarded-proto') || request.protocol
  return `${protocol.split(',')[0]}://${host.split(',')[0]}`
}

/**
 * Crawlable index of published content. Served as XML, so it is registered
 * outside the /api prefix and proxied straight through by Vite in development.
 */
router.get(
  '/sitemap.xml',
  asyncHandler(async (request, response) => {
    const base = absoluteSiteUrl(request)
    const projects = await prisma.project.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    const entries = [
      ...STATIC_PATHS.map((entry) => ({ ...entry, lastmod: null })),
      ...projects.map((project) => ({
        path: `/projects/${project.slug}`,
        priority: '0.6',
        changefreq: 'monthly',
        lastmod: project.updatedAt.toISOString().slice(0, 10),
      })),
    ]

    const urls = entries
      .map((entry) => {
        const parts = [`  <url>\n    <loc>${escapeXml(`${base}${entry.path}`)}</loc>`]
        if (entry.lastmod) parts.push(`    <lastmod>${entry.lastmod}</lastmod>`)
        parts.push(`    <changefreq>${entry.changefreq}</changefreq>`, `    <priority>${entry.priority}</priority>`, '  </url>')
        return parts.join('\n')
      })
      .join('\n')

    response.type('application/xml').set('cache-control', 'public, max-age=3600').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    )
  }),
)

router.get(
  '/robots.txt',
  (request, response) => {
    const base = absoluteSiteUrl(request)
    const body = ['User-agent: *', 'Disallow: /admin', 'Disallow: /api', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n')
    // No index directives here: the demo is public by design, /admin is the
    // only surface that must stay out of search results.
    response.type('text/plain').set('cache-control', 'public, max-age=86400').send(body)
  },
)

export default router
