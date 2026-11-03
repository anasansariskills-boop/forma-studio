import { ZodError } from 'zod'
import { ApiError } from '../lib/errors.js'

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    message: issue.message,
  }))
}

/**
 * Parses the named request parts and replaces them with the coerced result, so
 * routes only ever see validated, typed data.
 */
export function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      if (params) req.validParams = params.parse(req.params)
      if (query) req.validQuery = query.parse(req.query)
      if (body) req.body = body.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        next(ApiError.badRequest('Some fields need your attention.', formatIssues(error)))
        return
      }
      next(error)
    }
  }
}
