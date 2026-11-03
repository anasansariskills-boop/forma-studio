export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    if (details) this.details = details
  }

  static badRequest(message = 'Invalid request.', details) {
    return new ApiError(400, message, details)
  }

  static unauthorized(message = 'Sign in to continue.') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'You do not have access to this resource.') {
    return new ApiError(403, message)
  }

  static notFound(message = 'That resource does not exist.') {
    return new ApiError(404, message)
  }

  static conflict(message = 'That record already exists.') {
    return new ApiError(409, message)
  }

  static payloadTooLarge(message = 'That file is too large.') {
    return new ApiError(413, message)
  }

  toJSON() {
    return {
      error: {
        status: this.status,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    }
  }
}

/** Wraps an async route so rejected promises reach the error middleware. */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

/** Translates Prisma's engine errors into the HTTP status the client expects. */
export function fromPrismaError(error, resource = 'record') {
  const code = error?.code
  if (code === 'P2002') return ApiError.conflict(`A ${resource} with that identifier already exists.`)
  if (code === 'P2025') return ApiError.notFound(`That ${resource} does not exist.`)
  if (code === 'P2003') return ApiError.badRequest('The referenced record does not exist.')
  return error
}
