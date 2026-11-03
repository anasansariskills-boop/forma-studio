import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { prisma } from '../../lib/prisma.js'
import { ApiError, asyncHandler } from '../../lib/errors.js'
import { validate } from '../../middleware/validate.js'
import { studioUpdateBody } from '../../lib/validation.js'
import { storeImage, uploader } from '../../lib/storage.js'

const router = Router()

router.use(requireAdmin)

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const studio = await prisma.studioProfile.findUnique({ where: { id: 'default' } })
    if (!studio) throw ApiError.notFound('Run the seed script to create the studio profile.')
    response.json({ studio })
  }),
)

router.patch(
  '/',
  validate({ body: studioUpdateBody }),
  asyncHandler(async (request, response) => {
    if (Object.keys(request.body).length === 0) throw ApiError.badRequest('Nothing to update.')
    const studio = await prisma.studioProfile
      .update({ where: { id: 'default' }, data: request.body })
      .catch(() => {
        throw ApiError.notFound('Run the seed script to create the studio profile.')
      })
    response.json({ studio })
  }),
)

/** Shared upload target for the studio profile images (hero, intro, philosophy). */
router.post(
  '/media',
  uploader.array('images', 4),
  asyncHandler(async (request, response) => {
    const files = request.files ?? []
    if (files.length === 0) throw ApiError.badRequest('Choose at least one image to upload.')

    const stored = []
    for (const file of files) {
      stored.push(await storeImage(file.buffer, { folder: 'studio' }))
    }
    response.status(201).json({ images: stored })
  }),
)

export default router
