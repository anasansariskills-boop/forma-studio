import { existsSync } from 'node:fs'
import path from 'node:path'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { MulterError } from 'multer'
import { Prisma } from '@prisma/client'
import { config } from './config.js'
import { prisma } from './lib/prisma.js'
import { ApiError } from './lib/errors.js'
import { requestLog } from './middleware/logger.js'
import publicRoutes from './routes/public.js'
import inquiryRoutes from './routes/inquiries.js'
import discoveryRoutes from './routes/sitemap.js'
import adminRoutes from './routes/admin/index.js'

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'self'"],
  upgradeInsecureRequests: config.isProduction ? [] : null,
}

function isAllowedOrigin(origin) {
  if (!origin) return true
  if (config.corsOrigins.includes('*')) return true
  return config.corsOrigins.some((allowed) => allowed.replace(/\/$/, '') === origin.replace(/\/$/, ''))
}

export function createApp() {
  const app = express()
  const clientBuilt = existsSync(config.clientDist)

  app.disable('x-powered-by')
  if (config.isProduction) app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: clientBuilt ? { useDefaults: true, directives: cspDirectives } : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  )
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!isAllowedOrigin(origin)) return callback(ApiError.forbidden('This origin is not allowed to call the API.'))
        callback(null, true)
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['content-type', 'authorization', 'x-inquiry-source'],
      maxAge: 600,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))
  app.use(requestLog)

  // Filenames are content-unique, so they can be cached hard.
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '1y', immutable: true, index: false, fallthrough: true }))
  app.use('/uploads', () => {
    throw ApiError.notFound('That image does not exist.')
  })

  app.get('/api/health', async (_request, response) => {
    try {
      await prismaPing()
      response.json({ status: 'ok', env: config.env, client: clientBuilt, time: new Date().toISOString() })
    } catch {
      response.status(503).json({ status: 'degraded', database: 'unreachable' })
    }
  })

  app.use(discoveryRoutes)
  app.use('/api', publicRoutes)
  app.use('/api', inquiryRoutes)
  app.use('/api/admin', adminRoutes)

  app.use('/api', (request) => {
    throw ApiError.notFound(`No API route for ${request.method} ${request.baseUrl}${request.path}`)
  })

  if (clientBuilt) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (/\.(js|css|woff2|jpg|webp|png)$/.test(filePath)) res.setHeader('cache-control', 'public, max-age=31536000, immutable')
        },
      }),
    )
    app.use((request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html')) return next()
      response.sendFile(path.join(config.clientDist, 'index.html'))
      return undefined
    })
  }

  app.use((request, response) => {
    response.status(404).format({
      json: () => response.json({ error: { status: 404, message: 'Not found.' } }),
      text: () => response.send('Not found'),
      html: () => response.send('<h1>404 — not found</h1>'),
    })
  })

  app.use(errorHandler)
  return app
}

async function prismaPing() {
  const { prisma } = await import('./lib/prisma.js')
  await prisma.$queryRaw`select 1`
}

function errorHandler(error, request, response, _next) {
  let normalised = error

  if (error instanceof MulterError) {
    normalised =
      error.code === 'LIMIT_FILE_SIZE'
        ? ApiError.payloadTooLarge(`Images must stay under ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`)
        : ApiError.badRequest(`Upload failed: ${error.message}.`)
  } else if (error?.type === 'entity.too.large') {
    normalised = ApiError.payloadTooLarge('That request body is too large.')
  } else if (error?.type === 'entity.parse.failed') {
    normalised = ApiError.badRequest('The request body is not valid JSON.')
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    normalised =
      error.code === 'P2002'
        ? ApiError.conflict('A record with that identifier already exists.')
        : error.code === 'P2025'
          ? ApiError.notFound('That record does not exist.')
          : new ApiError(400, 'The database rejected that change.')
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    normalised = ApiError.badRequest('That request does not match the record shape.')
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    normalised = new ApiError(503, 'The database is not reachable. Start it with npm run db:start.')
  }

  if (!(normalised instanceof ApiError)) {
    console.error('[error]', error?.stack ?? error)
    normalised = new ApiError(500, config.isProduction ? 'Something went wrong on our side.' : String(error?.message ?? error))
  }

  if (response.headersSent) return
  response.status(normalised.status).json(normalised.toJSON())
}
