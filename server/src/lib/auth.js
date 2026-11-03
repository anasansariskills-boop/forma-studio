import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { ApiError } from './errors.js'
import { prisma } from './prisma.js'

const ISSUER = 'forma-studio-api'

export const hashPassword = (plain) => bcrypt.hash(plain, 12)
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)

export function signToken(user) {
  return jwt.sign({ email: user.email, role: user.role, name: user.name }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
    issuer: ISSUER,
    subject: user.id,
  })
}

function decode(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER })
}

/** Resolves the bearer token to a live admin row, so revoked accounts lose access immediately. */
export async function authenticate(request) {
  const header = request.headers.authorization ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized()

  let payload
  try {
    payload = decode(token)
  } catch (error) {
    const reason = error.name === 'TokenExpiredError' ? 'Your session expired. Please sign in again.' : 'Your session is not valid.'
    throw ApiError.unauthorized(reason)
  }

  const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, role: true } })
  if (!admin) throw ApiError.unauthorized('That account no longer exists.')
  return admin
}
