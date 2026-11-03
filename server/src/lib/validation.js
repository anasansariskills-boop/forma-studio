import { z } from 'zod'

export const PROJECT_CATEGORIES = ['ARCHITECTURE', 'INTERIOR', 'COMMERCIAL', 'RENOVATION']
export const PROJECT_STATUSES = ['COMPLETED', 'IN_CONSTRUCTION', 'IN_DESIGN']
export const INQUIRY_STATUSES = ['NEW', 'READ', 'REPLIED', 'ARCHIVED']
export const PROJECT_TYPES = ['NEW_BUILD', 'RENOVATION', 'INTERIOR', 'COMMERCIAL', 'OTHER']
export const BUDGET_RANGES = ['under-100k', '100k-250k', '250k-500k', '500k-1m', 'over-1m', 'undefined']
export const TIMELINES = ['asap', 'within-6-months', 'within-12-months', 'exploring']

const slug = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.')

const imageUrl = z
  .string()
  .trim()
  .max(400)
  .refine((value) => value.startsWith('/') || /^https?:\/\//.test(value), {
    message: 'Image must be an uploaded file, a site path or an absolute URL.',
  })

const text = (min, max) => z.string().trim().min(min).max(max)
const optionalText = (max) => z.string().trim().max(max).nullable().optional()
const stringList = (max = 12) => z.array(text(1, 60)).max(max).optional()

/** Reads may be filtered and searched; every value is whitelisted. */
export const projectListQuery = z.object({
  category: z.enum(PROJECT_CATEGORIES).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  published: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  search: text(1, 60).optional(),
  sort: z.enum(['recent', 'oldest', 'title', 'manual']).default('manual'),
  page: z.coerce.number().int().min(1).max(200).default(1),
  perPage: z.coerce.number().int().min(1).max(60).default(24),
})

const projectCore = {
  slug,
  title: text(3, 90),
  excerpt: text(10, 240),
  description: text(40, 12000),
  location: text(2, 90),
  country: text(2, 60),
  year: z.coerce.number().int().min(1850).max(2100),
  areaSqm: z.coerce.number().int().min(1).max(200000).nullish(),
  client: optionalText(90),
  materials: stringList(20),
  tags: stringList(12),
  category: z.enum(PROJECT_CATEGORIES),
  status: z.enum(PROJECT_STATUSES).default('COMPLETED'),
  coverImageUrl: imageUrl,
  coverImageAlt: text(3, 180),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
}

export const projectCreateBody = z.object({ ...projectCore, slug: slug.optional() })
export const projectUpdateBody = z.object({ ...projectCore, slug: slug.optional() }).partial()

/** Admin lists can see drafts and search across every field. */
export const adminListQuery = z.object({
  search: text(1, 60).optional(),
  category: z.enum(PROJECT_CATEGORIES).optional(),
  published: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
})

export const publicProjectSlug = z.object({ slug: text(3, 80) })
export const recordIdParam = z.object({ id: z.uuid() })
export const imageIdParam = z.object({ id: z.uuid(), imageId: z.uuid() })
export const coverBody = z.object({ imageId: z.uuid() })

export const serviceCreateBody = z.object({
  slug: slug.optional(),
  title: text(3, 80),
  discipline: text(2, 60),
  excerpt: text(10, 240),
  description: text(40, 8000),
  scope: stringList(20),
  detail: stringList(20),
  imageUrl: imageUrl.optional(),
  imageAlt: z.string().trim().max(180).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(true),
})
export const serviceUpdateBody = serviceCreateBody.partial()

export const testimonialCreateBody = z.object({
  quote: text(30, 900),
  author: text(2, 90),
  role: text(2, 90),
  company: optionalText(90),
  projectId: z.uuid().nullable().optional(),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
})
export const testimonialUpdateBody = testimonialCreateBody.partial()

/** Public inquiry form. `company` is a hidden honeypot — a human never fills it. */
export const inquiryCreateBody = z.object({
  name: text(2, 80),
  email: z.email().max(160),
  phone: optionalText(40),
  projectType: z.enum(PROJECT_TYPES),
  budget: z.enum(BUDGET_RANGES).optional(),
  timeline: z.enum(TIMELINES).optional(),
  location: optionalText(90),
  message: text(20, 4000),
  // Accepted as-is: a bot filling the hidden field must still get a 201.
  company: z.string().max(200).optional(),
})

export const inquiryListQuery = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  search: text(1, 60).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
})

export const inquiryUpdateBody = z
  .object({
    status: z.enum(INQUIRY_STATUSES).optional(),
    adminNote: z.string().trim().max(2000).nullish(),
  })
  .refine((value) => value.status !== undefined || value.adminNote !== undefined, {
    message: 'Provide a status or a note.',
  })

/** The studio profile is a single document; every edit is a partial patch. */
export const studioUpdateBody = z
  .object({
    heroKicker: text(1, 80),
    heroTitle: text(3, 180),
    heroLead: text(10, 500),
    heroImageUrl: imageUrl,
    heroImageAlt: text(3, 180),
    introKicker: text(1, 80),
    introTitle: text(3, 180),
    introImageUrl: imageUrl,
    introImageAlt: text(3, 180),
    introBody: z.array(text(10, 900)).min(1).max(6),
    philosophyImageUrl: imageUrl,
    philosophyImageAlt: text(3, 180),
    philosophy: z.array(text(10, 700)).min(1).max(6),
    process: z.array(z.object({ step: text(1, 12), title: text(2, 70), body: text(10, 500) })).max(8),
    stats: z.array(z.object({ value: text(1, 24), label: text(2, 60) })).max(8),
    street: text(2, 120),
    city: text(2, 80),
    country: text(2, 60),
    email: z.email().max(160),
    phone: text(4, 40),
    hours: text(2, 80),
    instagram: z.url().max(200).nullish(),
    linkedin: z.url().max(200).nullish(),
    foundedYear: z.coerce.number().int().min(1800).max(2100),
  })
  .partial()

export const loginBody = z.object({
  email: z.email().max(160),
  password: z.string().min(1).max(200),
})

export const imageOrderBody = z.object({
  ids: z.array(z.uuid()).min(1).max(80),
})

export const imageAltBody = z.object({
  alt: text(3, 180),
  caption: z.string().trim().max(200).nullish(),
})

export const repositionBody = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
})
