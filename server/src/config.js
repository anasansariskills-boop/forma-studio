import { config as loadEnv } from 'dotenv'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(here, '..', '.env'), quiet: true })

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable "${name}". Copy server/.env.example to server/.env.`)
  return value
}

const root = resolve(here, '..')

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  get isProduction() {
    return this.env === 'production'
  },
  port: Number(process.env.PORT ?? 8787),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // On Vercel the deployment directory is read-only; /tmp is the only writable
  // path. Uploaded images are therefore per-instance and temporary there —
  // point UPLOAD_DIR at a mounted volume (or move storage to S3/Blob) for real
  // persistence. Locally nothing changes.
  uploadDir: resolve(root, process.env.UPLOAD_DIR ?? (process.env.VERCEL ? '/tmp/forma-uploads' : 'uploads')),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 12) * 1024 * 1024,
  publicBaseUrl: (process.env.PUBLIC_URL ?? '').replace(/\/$/, ''),
  clientDist: resolve(root, '..', 'client', 'dist'),
  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL ?? 'studio@forma-studio.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'FormaStudio#2026',
  },
}

if (config.isProduction && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.')
}
