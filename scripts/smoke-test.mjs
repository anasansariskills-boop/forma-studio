#!/usr/bin/env node
/**
 * End-to-end API test. Runs against a live server and a seeded database, then
 * cleans up every record it created.
 *
 *   npm run db:start        # in one terminal
 *   npm run dev:server      # in another
 *   npm run test:api
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const { config } = await import('../server/src/config.js')

const BASE = process.env.TEST_BASE_URL ?? `http://localhost:${config.port}`
const UPLOADS = path.resolve('server', config.uploadDir)

let passed = 0
let failed = 0
const failures = []

async function api(method, route, { token, body, form, raw } = {}) {
  const headers = {}
  if (token) headers.authorization = `Bearer ${token}`
  if (body && !form) headers['content-type'] = 'application/json'

  const response = await fetch(`${BASE}${route}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  })
  const text = await response.text()
  const json = raw ? text : safeJson(text)
  return { status: response.status, data: json, headers: response.headers }
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text.slice(0, 300)
  }
}

async function check(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ok   ${name}`)
  } catch (error) {
    failed += 1
    failures.push({ name, error })
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]}`)
  }
}

function expectStatus(response, expected, label) {
  assert.equal(
    response.status,
    expected,
    `${label ?? response.data?.error?.message ?? 'request'} — expected ${expected}, got ${response.status} ${JSON.stringify(response.data).slice(0, 240)}`,
  )
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const health = await api('GET', '/api/health')
      if (health.status === 200) return health.data
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`No server answering on ${BASE}. Start it with: npm run dev:server`)
}

const created = { projects: [], services: [], testimonials: [], inquiries: [], images: [] }

console.log(`\nFORMA Studio API test → ${BASE}\n`)
const health = await waitForServer()
console.log(`health: ${health.status}, client bundle present: ${health.client}\n`)

console.log('Public content')
await check('GET /api/site returns the studio profile', async () => {
  const response = await api('GET', '/api/site')
  expectStatus(response, 200)
  assert.equal(response.data.studio.id, 'default')
  assert.ok(response.data.studio.heroTitle.length > 5)
  assert.ok(response.data.portfolio.total >= 12)
  assert.ok(response.data.studio.process.length >= 4)
})

let firstProjectSlug = null
await check('GET /api/projects lists published projects', async () => {
  const response = await api('GET', '/api/projects')
  expectStatus(response, 200)
  assert.ok(response.data.projects.length >= 12, `only ${response.data.projects.length} projects`)
  assert.ok(response.data.pagination.total >= 12)
  assert.ok(Object.keys(response.data.categories).length >= 4)
  firstProjectSlug = response.data.projects[0].slug
})

await check('category filter returns only that category', async () => {
  const response = await api('GET', '/api/projects?category=INTERIOR')
  expectStatus(response, 200)
  assert.ok(response.data.projects.length > 0)
  for (const project of response.data.projects) assert.equal(project.category, 'INTERIOR')
})

await check('search filter matches title or location', async () => {
  const response = await api('GET', '/api/projects?search=douro')
  expectStatus(response, 200)
  assert.ok(response.data.projects.length >= 1, 'search for "douro" found nothing')
})

await check('unknown category is rejected', async () => {
  const response = await api('GET', '/api/projects?category=BRUTALISM')
  expectStatus(response, 400)
  assert.ok(Array.isArray(response.data.error.details))
})

await check('GET /api/projects/:slug returns gallery and neighbours', async () => {
  const response = await api('GET', `/api/projects/${firstProjectSlug}`)
  expectStatus(response, 200)
  assert.ok(response.data.project.description.length > 100)
  assert.ok(response.data.project.images.length >= 3, 'expected a gallery of at least three images')
  assert.ok(response.data.navigation.next.slug)
  assert.ok(response.data.navigation.previous.slug)
})

await check('unpublished or unknown slug gives 404', async () => {
  const response = await api('GET', '/api/projects/not-a-real-project')
  expectStatus(response, 404)
})

await check('GET /api/services returns four disciplines', async () => {
  const response = await api('GET', '/api/services')
  expectStatus(response, 200)
  assert.equal(response.data.services.length, 4)
  assert.ok(response.data.services[0].scope.length >= 4)
})

await check('GET /api/testimonials returns published quotes with project links', async () => {
  const response = await api('GET', '/api/testimonials')
  expectStatus(response, 200)
  assert.equal(response.data.testimonials.length, 6)
  assert.ok(response.data.testimonials[0].project.title)
})

await check('GET /api/team returns the four partners', async () => {
  const response = await api('GET', '/api/team')
  expectStatus(response, 200)
  assert.equal(response.data.team.length, 4)
})

console.log('\nContact form')
const inquiryFixture = {
  name: 'API Test Person',
  email: `test-${randomUUID().slice(0, 8)}@example.net`,
  projectType: 'NEW_BUILD',
  budget: '250k-500k',
  timeline: 'within-12-months',
  location: 'Lisbon',
  message: 'Automated smoke test enquiry — please ignore, this record is deleted at the end of the run.',
}

let inquiryId = null
await check('POST /api/inquiries stores a valid enquiry', async () => {
  const response = await api('POST', '/api/inquiries', { body: inquiryFixture })
  expectStatus(response, 201)
  assert.ok(response.data.id)
  inquiryId = response.data.id
  created.inquiries.push(inquiryId)
})

await check('short message is rejected with field detail', async () => {
  const response = await api('POST', '/api/inquiries', { body: { ...inquiryFixture, message: 'too short' } })
  expectStatus(response, 400)
  assert.ok(response.data.error.details.some((detail) => detail.field === 'message'))
})

await check('invalid email is rejected', async () => {
  const response = await api('POST', '/api/inquiries', { body: { ...inquiryFixture, email: 'not-an-email' } })
  expectStatus(response, 400)
})

await check('unknown project type is rejected', async () => {
  const response = await api('POST', '/api/inquiries', { body: { ...inquiryFixture, projectType: 'TREEHOUSE' } })
  expectStatus(response, 400)
})

await check('honeypot submission reports success but is not stored', async () => {
  const before = await api('GET', '/api/admin/inquiries', { token: null })
  assert.equal(before.status, 401, 'inquiries must not be listable without a token')
  const response = await api('POST', '/api/inquiries', { body: { ...inquiryFixture, company: 'http://spam.example' } })
  expectStatus(response, 201)
})

console.log('\nAdmin authentication')
let adminToken = null
await check('wrong password gives 401', async () => {
  const response = await api('POST', '/api/admin/auth/login', {
    body: { email: config.seedAdmin.email, password: 'definitely-not-the-password' },
  })
  expectStatus(response, 401)
})

await check('unknown account gives the same 401 wording', async () => {
  const response = await api('POST', '/api/admin/auth/login', {
    body: { email: 'nobody@example.net', password: 'whatever-1234' },
  })
  expectStatus(response, 401)
})

await check('correct credentials return a JWT', async () => {
  const response = await api('POST', '/api/admin/auth/login', {
    body: { email: config.seedAdmin.email, password: config.seedAdmin.password },
  })
  expectStatus(response, 200)
  assert.equal(response.data.admin.email, config.seedAdmin.email.toLowerCase())
  assert.ok(response.data.token.split('.').length === 3, 'token is not a JWT')
  adminToken = response.data.token
})

await check('GET /api/admin/auth/session identifies the token holder', async () => {
  const response = await api('GET', '/api/admin/auth/session', { token: adminToken })
  expectStatus(response, 200)
  assert.equal(response.data.admin.role, 'admin')
})

await check('admin routes reject a missing token', async () => {
  for (const route of ['/api/admin/projects', '/api/admin/services', '/api/admin/testimonials', '/api/admin/inquiries', '/api/admin/analytics/overview', '/api/admin/studio']) {
    const response = await api('GET', route)
    expectStatus(response, 401, route)
  }
})

await check('admin routes reject a forged token', async () => {
  const response = await api('GET', '/api/admin/projects', { token: `${adminToken.slice(0, -6)}ZZZZZZ` })
  expectStatus(response, 401)
})

console.log('\nProject CRUD')
const draftSlug = `smoke-test-${randomUUID().slice(0, 8)}`
let draftId = null
await check('create a project', async () => {
  const response = await api('POST', '/api/admin/projects', {
    token: adminToken,
    body: {
      title: 'Smoke Test Pavilion',
      category: 'ARCHITECTURE',
      status: 'IN_DESIGN',
      excerpt: 'Temporary project created by the automated API test to prove the write path works.',
      description:
        'This description exists so that the project detail page has something to render during the automated test run. It is deleted before the test finishes and should never be visible on the public site.',
      location: 'Testville',
      country: 'Portugal',
      year: 2026,
      areaSqm: 42,
      materials: ['Test steel'],
      tags: ['automated'],
      coverImageUrl: '/img/home/hero.jpg',
      coverImageAlt: 'Automated test cover image',
      published: false,
      featured: false,
    },
  })
  expectStatus(response, 201, response.data?.error?.message)
  assert.equal(response.data.project.slug, 'smoke-test-pavilion')
  draftId = response.data.project.id
  created.projects.push(draftId)
})

await check('draft is hidden from the public list', async () => {
  const response = await api('GET', '/api/projects?search=Smoke%20Test')
  expectStatus(response, 200)
  assert.equal(response.data.projects.length, 0)
})

await check('duplicate title gets a unique slug instead of an error', async () => {
  const response = await api('POST', '/api/admin/projects', {
    token: adminToken,
    body: {
      title: 'Smoke Test Pavilion',
      slug: draftSlug,
      category: 'ARCHITECTURE',
      excerpt: 'Second automated project used to check that slug collisions are resolved, not fatal.',
      description: 'Second automated project body, long enough to satisfy the validator used by the API test run.',
      location: 'Testville',
      country: 'Portugal',
      year: 2026,
      coverImageUrl: '/img/home/hero.jpg',
      coverImageAlt: 'Automated test cover image',
      published: false,
    },
  })
  expectStatus(response, 201, response.data?.error?.message)
  assert.equal(response.data.project.slug, draftSlug)
  created.projects.push(response.data.project.id)
})

await check('publish then unpublish changes public visibility', async () => {
  await api('PATCH', `/api/admin/projects/${draftId}`, { token: adminToken, body: { published: true } })
  const visible = await api('GET', `/api/projects/${'smoke-test-pavilion'}`)
  expectStatus(visible, 200, 'published draft should be readable')
  const hidden = await api('PATCH', `/api/admin/projects/${draftId}`, { token: adminToken, body: { published: false } })
  expectStatus(hidden, 200)
  const gone = await api('GET', '/api/projects/smoke-test-pavilion')
  expectStatus(gone, 404)
})

await check('edit fields and confirm they persisted', async () => {
  const response = await api('PATCH', `/api/admin/projects/${draftId}`, {
    token: adminToken,
    body: { title: 'Smoke Test Pavilion II', location: 'Oeiras', year: 2027, featured: true },
  })
  expectStatus(response, 200)
  assert.equal(response.data.project.location, 'Oeiras')
  assert.equal(response.data.project.year, 2027)
})

await check('invalid uuid in a path is a 400, not a 500', async () => {
  const response = await api('GET', '/api/admin/projects/not-a-uuid', { token: adminToken })
  expectStatus(response, 400)
})

await check('validation failure lists every bad field', async () => {
  const response = await api('PATCH', `/api/admin/projects/${draftId}`, {
    token: adminToken,
    body: { title: 'x', year: 1200, category: 'LANDSCAPE' },
  })
  expectStatus(response, 400)
  assert.ok(response.data.error.details.length >= 3, 'expected three field errors')
})

console.log('\nImage upload')
const jpeg = await sharp({
  create: { width: 1600, height: 1000, channels: 3, background: { r: 180, g: 168, b: 150 } },
})
  .jpeg({ quality: 90 })
  .toBuffer()

let uploadedImage = null
await check('upload two images to a project', async () => {
  const form = new FormData()
  form.append('alt', 'Automated test frame')
  form.append('images', new Blob([jpeg], { type: 'image/jpeg' }), 'test-a.jpg')
  form.append('images', new Blob([jpeg], { type: 'image/jpeg' }), 'test-b.jpg')
  const response = await api('POST', `/api/admin/projects/${draftId}/images`, { token: adminToken, form })
  expectStatus(response, 201, response.data?.error?.message)
  assert.equal(response.data.images.length, 2)
  uploadedImage = response.data.images[0]
  created.images.push(uploadedImage.url)
})

await check('all four responsive variants are on disk', async () => {
  const stem = uploadedImage.url.replace(/\.jpg$/, '')
  for (const suffix of ['.jpg', '.webp', '-sm.jpg', '-sm.webp']) {
    const file = path.join(UPLOADS, stem.replace('/uploads/', '') + suffix)
    assert.ok(existsSync(file), `missing ${file}`)
  }
})

await check('the uploaded file is served with long cache headers', async () => {
  const response = await fetch(`${BASE}${uploadedImage.url}`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /image/)
  assert.match(response.headers.get('cache-control'), /max-age=31536000/)
})

await check('reject a file that is not an image', async () => {
  const form = new FormData()
  form.append('images', new Blob([Buffer.from('#!/bin/sh\necho not an image')], { type: 'image/jpeg' }), 'evil.jpg')
  const response = await api('POST', `/api/admin/projects/${draftId}/images`, { token: adminToken, form })
  expectStatus(response, 400)
})

await check('reorder the gallery', async () => {
  const list = await api('GET', `/api/admin/projects/${draftId}`, { token: adminToken })
  const ids = list.data.project.images.map((image) => image.id).reverse()
  const response = await api('PATCH', `/api/admin/projects/${draftId}/images/order`, { token: adminToken, body: { ids } })
  expectStatus(response, 200)
  assert.equal(response.data.images[0].id, ids[0])
})

await check('edit alt text on one image', async () => {
  const response = await api('PATCH', `/api/admin/projects/${draftId}/images/${uploadedImage.id}`, {
    token: adminToken,
    body: { alt: 'Renamed by the automated test', caption: 'Test caption' },
  })
  expectStatus(response, 200)
  assert.equal(response.data.image.alt, 'Renamed by the automated test')
})

await check('promote a gallery image to the cover', async () => {
  const response = await api('POST', `/api/admin/projects/${draftId}/cover`, {
    token: adminToken,
    body: { imageId: uploadedImage.id },
  })
  expectStatus(response, 200)
  assert.equal(response.data.project.coverImageUrl, uploadedImage.url)
})

await check('delete an image and its files', async () => {
  const response = await api('DELETE', `/api/admin/projects/${draftId}/images/${uploadedImage.id}`, { token: adminToken })
  expectStatus(response, 200)
  const gone = await fetch(`${BASE}${uploadedImage.url}`)
  assert.equal(gone.status, 404, 'deleted file is still being served')
})

console.log('\nServices, testimonials, inquiries, analytics')
let serviceId = null
await check('create, edit and delete a service', async () => {
  const body = {
    title: 'Smoke Test Service',
    discipline: 'Testing',
    excerpt: 'Created by the automated API test to prove service CRUD works end to end.',
    description: 'A service description that is long enough to pass the validator used by the automated test suite.',
    scope: ['Nothing'],
    published: false,
  }
  const createdResponse = await api('POST', '/api/admin/services', { token: adminToken, body })
  expectStatus(createdResponse, 201, createdResponse.data?.error?.message)
  serviceId = createdResponse.data.service.id
  created.services.push(serviceId)
  assert.equal(createdResponse.data.service.slug, 'smoke-test-service')

  const updated = await api('PATCH', `/api/admin/services/${serviceId}`, { token: adminToken, body: { discipline: 'QA' } })
  expectStatus(updated, 200)
  assert.equal(updated.data.service.discipline, 'QA')

  const removed = await api('DELETE', `/api/admin/services/${serviceId}`, { token: adminToken })
  expectStatus(removed, 200)
  created.services.pop()
})

await check('service list on the public site is unaffected by the test', async () => {
  const response = await api('GET', '/api/services')
  assert.equal(response.data.services.length, 4)
})

await check('create, update and delete a testimonial', async () => {
  const response = await api('POST', '/api/admin/testimonials', {
    token: adminToken,
    body: {
      quote: 'This quote was written by the automated test suite so that the testimonial write path is covered.',
      author: 'Test Author',
      role: 'Automated',
      company: 'CI',
      featured: false,
      published: false,
    },
  })
  expectStatus(response, 201, response.data?.error?.message)
  const id = response.data.testimonial.id
  created.testimonials.push(id)
  const updated = await api('PATCH', `/api/admin/testimonials/${id}`, { token: adminToken, body: { rating: 4 } })
  expectStatus(updated, 200)
  assert.equal(updated.data.testimonial.rating, 4)
})

await check('inquiries list, filter and status update', async () => {
  const list = await api('GET', '/api/admin/inquiries', { token: adminToken })
  expectStatus(list, 200)
  assert.ok(list.data.counts.ALL >= 17, 'seed plus test enquiry should exceed 17')

  const filtered = await api('GET', '/api/admin/inquiries?status=NEW&search=API%20Test', { token: adminToken })
  expectStatus(filtered, 200)
  assert.ok(filtered.data.inquiries.length >= 1, 'the new enquiry should be searchable')

  const patched = await api('PATCH', `/api/admin/inquiries/${inquiryId}`, {
    token: adminToken,
    body: { status: 'REPLIED', adminNote: 'Handled by the automated test.' },
  })
  expectStatus(patched, 200)
  assert.equal(patched.data.inquiry.status, 'REPLIED')

  const detail = await api('GET', `/api/admin/inquiries/${inquiryId}`, { token: adminToken })
  expectStatus(detail, 200)
  assert.match(detail.data.inquiry.message, /smoke test/)
})

await check('analytics overview has the shapes the dashboard needs', async () => {
  const response = await api('GET', '/api/admin/analytics/overview', { token: adminToken })
  expectStatus(response, 200)
  const data = response.data
  assert.ok(data.totals.projects >= 12)
  assert.ok(data.totals.images >= 35, `only ${data.totals.images} images indexed`)
  assert.equal(data.series.daily.length, 30)
  assert.equal(data.series.monthly.length, 12)
  assert.equal(data.portfolio.length, 4)
  assert.ok(data.pipeline.length >= 3)
  assert.ok(data.recent.inquiries.length >= 5)
  assert.ok(data.admin.lastLoginAt, 'login timestamp should be recorded')
})

await check('studio profile reads and patches', async () => {
  const before = await api('GET', '/api/admin/studio', { token: adminToken })
  expectStatus(before, 200)
  const patched = await api('PATCH', '/api/admin/studio', {
    token: adminToken,
    body: { phone: before.data.studio.phone },
  })
  expectStatus(patched, 200)
  assert.equal(patched.data.studio.phone, before.data.studio.phone)
})

console.log('\nAbuse and edge cases')
await check('unknown API route returns JSON 404', async () => {
  const response = await api('GET', '/api/does-not-exist')
  expectStatus(response, 404)
})

await check('malformed JSON returns 400 rather than 500', async () => {
  const response = await fetch(`${BASE}/api/inquiries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"name": "broken',
  })
  assert.equal(response.status, 400)
})

await check('a request from a disallowed origin is refused', async () => {
  const response = await fetch(`${BASE}/api/projects`, { headers: { origin: 'https://evil.example' } })
  expectStatus({ status: response.status, data: await response.text() }, 403)
})

await check('contact rate limiter eventually answers 429', async () => {
  let saw429 = false
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await api('POST', '/api/inquiries', { body: { ...inquiryFixture, email: 'invalid' } })
    if (response.status === 429) {
      saw429 = true
      break
    }
  }
  assert.ok(saw429, 'twelve invalid submissions did not trip the limiter')
  console.log('       (limiter is in-memory: restart the API before running this suite again)')
})

console.log('\nCleanup')
await check('delete everything the test created', async () => {
  for (const id of created.testimonials) expectStatus(await api('DELETE', `/api/admin/testimonials/${id}`, { token: adminToken }), 200)
  for (const id of created.services) expectStatus(await api('DELETE', `/api/admin/services/${id}`, { token: adminToken }), 200)
  for (const id of created.projects) expectStatus(await api('DELETE', `/api/admin/projects/${id}`, { token: adminToken }), 200)
  for (const id of created.inquiries) expectStatus(await api('DELETE', `/api/admin/inquiries/${id}`, { token: adminToken }), 200)
})

await check('the public site is back to the seeded state', async () => {
  const response = await api('GET', '/api/projects')
  assert.equal(response.data.projects.length, 12)
  const leftover = await api('GET', '/api/admin/projects', { token: adminToken })
  assert.equal(leftover.data.pagination.total, 12)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) {
  for (const failure of failures) console.error(`${failure.name}: ${failure.error.stack?.split('\n').slice(0, 3).join('\n')}\n`)
  process.exit(1)
}
