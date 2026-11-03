/**
 * Thin admin-side wrapper over the shared `lib/api.js` surface.
 * Gallery reordering uses the `{ ids }` key required by `imageOrderBody`.
 */
import { adminApi, api, ApiError } from '../lib/api.js'

export { adminApi, ApiError }

/** Persist an explicit gallery order (pointer or keyboard driven). */
export function reorderImages(projectId, orderedImageIds) {
  return api.patch(
    `/admin/projects/${projectId}/images/order`,
    { ids: orderedImageIds },
    { token: adminApi.token() },
  )
}

/**
 * Runs an admin mutation, normalising anything thrown into an ApiError.
 * Returns `{ ok, data, error }` so a caller never has to try/catch inline and
 * so a 401 can be surfaced to the auth layer (which bounces to the login).
 */
export async function runAdmin(mutation, { onUnauthorized } = {}) {
  try {
    const data = await mutation()
    return { ok: true, data }
  } catch (error) {
    const wrapped =
      error instanceof ApiError
        ? error
        : new ApiError(error?.message ?? 'The request could not be completed.', { status: error?.status ?? 0 })
    if (wrapped.status === 401 && onUnauthorized) onUnauthorized()
    return { ok: false, error: wrapped }
  }
}
