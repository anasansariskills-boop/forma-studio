import { ApiError, asyncHandler } from '../lib/errors.js'
import { authenticate } from '../lib/auth.js'

export const requireAdmin = asyncHandler(async (request, response, next) => {
  request.admin = await authenticate(request)
  if (request.admin.role !== 'admin' && request.admin.role !== 'editor') {
    throw ApiError.forbidden('This account cannot manage studio content.')
  }
  next()
})
