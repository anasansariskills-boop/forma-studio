import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import sharp from 'sharp'
import { config } from '../config.js'
import { ApiError } from './errors.js'

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MASTER_WIDTH = 1600
const SMALL_WIDTH = 800

export async function ensureUploadDir() {
  await mkdir(config.uploadDir, { recursive: true })
}

export const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 8, fields: 12 },
  fileFilter(_request, file, callback) {
    if (!ACCEPTED.has(file.mimetype)) {
      callback(ApiError.badRequest('Upload a JPEG, PNG or WebP image.'))
      return
    }
    callback(null, true)
  },
})

function publicUrl(folder, name) {
  return `${config.publicBaseUrl}/uploads/${folder}/${name}`
}

/** Only paths under our own uploads directory may be touched by removeImage. */
function localPathFromUrl(url) {
  const marker = '/uploads/'
  const index = url?.indexOf(marker) ?? -1
  if (index === -1) return null
  const relative = decodeURIComponent(url.slice(index + marker.length)).split('?')[0]
  const parsed = path.parse(relative)
  if (parsed.name.includes('..') || parsed.dir.includes('..')) return null
  return { dir: path.join(config.uploadDir, parsed.dir), base: parsed.name, ext: parsed.ext }
}

/**
 * Normalises an uploaded image into a responsive set and returns the metadata
 * the API stores. Re-encoding strips EXIF (including GPS) and anything hidden
 * behind an image extension.
 */
export async function storeImage(buffer, { folder = 'projects' } = {}) {
  const image = sharp(buffer, { failOn: 'error' }).rotate()
  let meta
  try {
    meta = await image.metadata()
  } catch {
    throw ApiError.badRequest('That file could not be read as an image.')
  }
  if (!meta.width || !meta.height) throw ApiError.badRequest('That file could not be read as an image.')
  if (meta.width < 400 || meta.height < 300) {
    throw ApiError.badRequest('Images need to be at least 400 × 300 pixels for the full-width layouts.')
  }

  const base = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8)}`
  const dir = path.join(config.uploadDir, folder)
  await mkdir(dir, { recursive: true })

  const encode = (width, format, quality) =>
    image
      .clone()
      .resize({ width, withoutEnlargement: true })
      .toFormat(format, { quality })
      .toBuffer()

  const [masterJpeg, masterWebp, smallJpeg, smallWebp] = await Promise.all([
    encode(MASTER_WIDTH, 'jpeg', 78),
    encode(MASTER_WIDTH, 'webp', 72),
    encode(SMALL_WIDTH, 'jpeg', 76),
    encode(SMALL_WIDTH, 'webp', 70),
  ])

  const files = {
    [`${base}.jpg`]: masterJpeg,
    [`${base}.webp`]: masterWebp,
    [`${base}-sm.jpg`]: smallJpeg,
    [`${base}-sm.webp`]: smallWebp,
  }

  await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(path.join(dir, name), contents)))

  const stored = await sharp(masterJpeg).metadata()
  return {
    url: publicUrl(folder, `${base}.jpg`),
    webpUrl: publicUrl(folder, `${base}.webp`),
    smallUrl: publicUrl(folder, `${base}-sm.jpg`),
    smallWebpUrl: publicUrl(folder, `${base}-sm.webp`),
    width: stored.width,
    height: stored.height,
    bytes: Object.values(files).reduce((total, chunk) => total + chunk.length, 0),
    variants: Object.keys(files).map((name) => publicUrl(folder, name)),
  }
}

/** Removes the whole responsive set behind a stored URL; ignores external URLs. */
export async function removeImage(url) {
  const target = localPathFromUrl(url)
  if (!target) return false

  const stem = target.base.replace(/-sm$/, '')
  const candidates = [`${stem}.jpg`, `${stem}.webp`, `${stem}-sm.jpg`, `${stem}-sm.webp`]
  await Promise.all(
    candidates.map((name) =>
      unlink(path.join(target.dir, name)).catch((error) => {
        if (error.code !== 'ENOENT') console.warn(`[storage] could not remove ${name}: ${error.message}`)
      }),
    ),
  )
  return true
}
