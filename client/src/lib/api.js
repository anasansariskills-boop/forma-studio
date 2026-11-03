const BASE = '/api'

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    /** Field-level messages keyed by input name, ready for a form. */
    this.fields = Object.fromEntries((details ?? []).map((d) => [d.path ?? d.field, d.message]))
  }
}

async function request(path, { method = 'GET', body, token, form = false, headers = {} } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: form ? body : body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the studio server. Check your connection and try again.', { status: 0 })
  }

  const raw = await response.text()
  const payload = raw ? safeJson(raw) : null

  if (!response.ok) {
    const error = payload?.error ?? {}
    throw new ApiError(error.message ?? `Request failed (${response.status}).`, {
      status: response.status,
      details: Array.isArray(error.details) ? error.details : null,
    })
  }

  return payload
}

function safeJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const withQuery = (path, params) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

/** Public content. `params` maps straight onto the query string. */
export const publicApi = {
  site: () => api.get('/site'),
  projects: (params) => api.get(withQuery('/projects', params)),
  project: (slug) => api.get(`/projects/${slug}`),
  services: () => api.get('/services'),
  service: async (slug) => {
    const { services } = await api.get('/services')
    const found = services.find((service) => service.slug === slug)
    if (!found) {
      throw new ApiError(`No service called “${slug}”.`, { status: 404 })
    }
    return { service: found }
  },
  team: () => api.get('/team'),
  testimonials: (params) => api.get(withQuery('/testimonials', params)),
  /** Returns the created inquiry; throws ApiError with .fields on 400. */
  inquire: (payload, source = 'website') =>
    api.post('/inquiries', payload, { headers: { 'x-inquiry-source': source } }),
}

const TOKEN_KEY = 'forma.admin.token'

export const adminApi = {
  token: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clearToken: () => sessionStorage.removeItem(TOKEN_KEY),

  login: (email, password) => api.post('/admin/auth/login', { email, password }),
  /** The API is stateless — signing out just discards the token. */
  logout: () => adminApi.clearToken(),
  session: () => api.get('/admin/auth/session', { token: adminApi.token() }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/admin/auth/password', { currentPassword, newPassword }, { token: adminApi.token() }),

  analytics: () => api.get('/admin/analytics/overview', { token: adminApi.token() }),
  studio: () => api.get('/admin/studio', { token: adminApi.token() }),
  updateStudio: (body) => api.patch('/admin/studio', body, { token: adminApi.token() }),
  /** Returns { images: [{ url, webpUrl, smallUrl, ... }] } — assign the url to the field you uploaded for. */
  uploadStudioImages: (files) => {
    const form = new FormData()
    files.forEach((file) => form.append('images', file))
    return api.post('/admin/studio/media', form, { token: adminApi.token(), form: true })
  },

  projects: (params) => api.get(withQuery('/admin/projects', params), { token: adminApi.token() }),
  project: (id) => api.get(`/admin/projects/${id}`, { token: adminApi.token() }),
  createProject: (body) => api.post('/admin/projects', body, { token: adminApi.token() }),
  updateProject: (id, body) => api.patch(`/admin/projects/${id}`, body, { token: adminApi.token() }),
  deleteProject: (id) => api.del(`/admin/projects/${id}`, { token: adminApi.token() }),
  uploadImages: (id, files) => {
    const form = new FormData()
    files.forEach((file) => form.append('images', file))
    return api.post(`/admin/projects/${id}/images`, form, { token: adminApi.token(), form: true })
  },
  updateImage: (id, imageId, body) =>
    api.patch(`/admin/projects/${id}/images/${imageId}`, body, { token: adminApi.token() }),
  deleteImage: (id, imageId) => api.del(`/admin/projects/${id}/images/${imageId}`, { token: adminApi.token() }),
  reorderImages: (id, imageIds) => api.patch(`/admin/projects/${id}/images/order`, { imageIds }, { token: adminApi.token() }),
  setCover: (id, imageId) => api.post(`/admin/projects/${id}/cover`, { imageId }, { token: adminApi.token() }),

  services: () => api.get('/admin/services', { token: adminApi.token() }),
  createService: (body) => api.post('/admin/services', body, { token: adminApi.token() }),
  updateService: (id, body) => api.patch(`/admin/services/${id}`, body, { token: adminApi.token() }),
  deleteService: (id) => api.del(`/admin/services/${id}`, { token: adminApi.token() }),

  testimonials: () => api.get('/admin/testimonials', { token: adminApi.token() }),
  createTestimonial: (body) => api.post('/admin/testimonials', body, { token: adminApi.token() }),
  updateTestimonial: (id, body) => api.patch(`/admin/testimonials/${id}`, body, { token: adminApi.token() }),
  deleteTestimonial: (id) => api.del(`/admin/testimonials/${id}`, { token: adminApi.token() }),

  inquiries: (params) => api.get(withQuery('/admin/inquiries', params), { token: adminApi.token() }),
  inquiry: (id) => api.get(`/admin/inquiries/${id}`, { token: adminApi.token() }),
  updateInquiry: (id, body) => api.patch(`/admin/inquiries/${id}`, body, { token: adminApi.token() }),
  deleteInquiry: (id) => api.del(`/admin/inquiries/${id}`, { token: adminApi.token() }),
}
