import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler, fromPrismaError } from '../../lib/errors.js'
import { validate } from '../../middleware/validate.js'
import { adminListQuery, coverBody, imageAltBody, imageIdParam, imageOrderBody, projectCreateBody, projectUpdateBody, recordIdParam } from '../../lib/validation.js'
import { uniqueSlug } from '../../lib/slugs.js'
import { removeImage, storeImage, uploader } from '../../lib/storage.js'

const router = Router()

const listSelect = {
  id: true,
  slug: true,
  title: true,
  category: true,
  status: true,
  year: true,
  location: true,
  published: true,
  featured: true,
  sortOrder: true,
  coverImageUrl: true,
  updatedAt: true,
  _count: { select: { images: true, testimonials: true } },
}

router.get(
  '/',
  validate({ query: adminListQuery }),
  asyncHandler(async (request, response) => {
    const { search, category, published, page, perPage } = request.validQuery
    const where = {
      ...(category ? { category } : {}),
      ...(published === undefined ? {} : { published }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        select: listSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ])

    response.json({ projects, pagination: { page, perPage, total, pages: Math.max(1, Math.ceil(total / perPage)) } })
  }),
)

router.get(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    const project = await prisma.project.findUnique({
      where: { id: request.validParams.id },
      include: { images: { orderBy: [{ sortOrder: 'asc' }] } },
    })
    if (!project) throw ApiError.notFound('That project does not exist.')
    response.json({ project })
  }),
)

router.post(
  '/',
  validate({ body: projectCreateBody }),
  asyncHandler(async (request, response) => {
    const data = request.body
    const slug = data.slug ? await uniqueSlug(prisma.project, 'slug', data.slug) : await uniqueSlug(prisma.project, 'slug', data.title)
    const project = await prisma.project
      .create({ data: { ...data, slug } })
      .catch((error) => {
        throw fromPrismaError(error, 'project')
      })
    response.status(201).json({ project })
  }),
)

router.patch(
  '/:id',
  validate({ params: recordIdParam, body: projectUpdateBody }),
  asyncHandler(async (request, response) => {
    const { id } = request.validParams
    const { slug, ...rest } = request.body

    const project = await prisma.project
      .update({
        where: { id },
        data: { ...rest, ...(slug ? { slug: await uniqueSlug(prisma.project, 'slug', slug, { excludeId: id }) } : {}) },
      })
      .catch((error) => {
        throw fromPrismaError(error, 'project')
      })

    response.json({ project })
  }),
)

router.delete(
  '/:id',
  validate({ params: recordIdParam }),
  asyncHandler(async (request, response) => {
    const { id } = request.validParams
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, coverImageUrl: true, images: { select: { url: true } } },
    })
    if (!project) throw ApiError.notFound('That project does not exist.')

    await prisma.project.delete({ where: { id } })
    // Files are removed after the row, so a failed delete never orphans a record.
    await Promise.all([removeImage(project.coverImageUrl), ...project.images.map((image) => removeImage(image.url))])

    response.json({ ok: true, id })
  }),
)

/** Accepts up to eight images per request and appends them to the gallery. */
router.post(
  '/:id/images',
  validate({ params: recordIdParam }),
  uploader.array('images', 8),
  asyncHandler(async (request, response) => {
    const { id } = request.validParams
    const project = await prisma.project.findUnique({ where: { id }, select: { id: true, title: true, slug: true } })
    if (!project) throw ApiError.notFound('That project does not exist.')

    const last = await prisma.projectImage.aggregate({ where: { projectId: id }, _max: { sortOrder: true } })
    const files = request.files ?? []
    if (files.length === 0) throw ApiError.badRequest('Choose at least one image to upload.')

    const created = []
    for (const [index, file] of files.entries()) {
      const stored = await storeImage(file.buffer, { folder: `projects/${project.slug ?? id}` })
      created.push(
        await prisma.projectImage.create({
          data: {
            projectId: id,
            url: stored.url,
            alt: request.body?.alt?.trim() || `${project.title} — image ${index + 1}`,
            caption: request.body?.caption?.trim() || null,
            width: stored.width,
            height: stored.height,
            sortOrder: (last._max.sortOrder ?? -1) + index + 1,
          },
        }),
      )
    }

    response.status(201).json({ images: created, count: created.length })
  }),
)

router.patch(
  '/:id/images/order',
  validate({ params: recordIdParam, body: imageOrderBody }),
  asyncHandler(async (request, response) => {
    const { id } = request.validParams
    const { ids } = request.body
    const owned = await prisma.projectImage.count({ where: { projectId: id, id: { in: ids } } })
    if (owned !== ids.length) throw ApiError.badRequest('That image list does not match this project.')

    await prisma.$transaction(ids.map((imageId, index) => prisma.projectImage.update({ where: { id: imageId }, data: { sortOrder: index } })))
    const images = await prisma.projectImage.findMany({ where: { projectId: id }, orderBy: { sortOrder: 'asc' } })
    response.json({ images })
  }),
)

router.patch(
  '/:id/images/:imageId',
  validate({ params: imageIdParam, body: imageAltBody }),
  asyncHandler(async (request, response) => {
    const { id, imageId } = request.validParams
    const image = await prisma.projectImage.findFirst({
      where: { id: imageId, projectId: id },
      select: { id: true },
    })
    if (!image) throw ApiError.notFound('That image does not exist.')

    const { alt, caption } = request.body
    const updated = await prisma.projectImage.update({
      where: { id: image.id },
      data: { alt, caption: caption ?? null },
    })
    response.json({ image: updated })
  }),
)

router.delete(
  '/:id/images/:imageId',
  validate({ params: imageIdParam }),
  asyncHandler(async (request, response) => {
    const { id, imageId } = request.validParams
    const image = await prisma.projectImage.findFirst({
      where: { id: imageId, projectId: id },
      select: { id: true, url: true },
    })
    if (!image) throw ApiError.notFound('That image does not exist.')

    await prisma.projectImage.delete({ where: { id: image.id } })
    await removeImage(image.url)
    response.json({ ok: true, id: image.id })
  }),
)

/** Lets the editor promote any gallery frame to the card cover. */
router.post(
  '/:id/cover',
  validate({ params: recordIdParam, body: coverBody }),
  asyncHandler(async (request, response) => {
    const project = await prisma.project.findUnique({
      where: { id: request.validParams.id },
      select: { id: true, images: { where: { id: request.body.imageId }, select: { url: true, alt: true } } },
    })
    if (!project) throw ApiError.notFound('That project does not exist.')
    const [image] = project.images
    if (!image) throw ApiError.badRequest('Upload a gallery image first.')

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { coverImageUrl: image.url, coverImageAlt: image.alt },
      select: { id: true, coverImageUrl: true, coverImageAlt: true },
    })
    response.json({ project: updated })
  }),
)

export default router
