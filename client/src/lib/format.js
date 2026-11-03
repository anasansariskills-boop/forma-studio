export const CATEGORY_LABELS = {
  ARCHITECTURE: 'Architecture',
  INTERIOR: 'Interiors',
  COMMERCIAL: 'Commercial',
  RENOVATION: 'Renovation',
}

export const PROJECT_STATUSES = {
  COMPLETED: 'Completed',
  IN_CONSTRUCTION: 'In construction',
  IN_DESIGN: 'In design',
}

export const PROJECT_TYPES = {
  NEW_BUILD: 'New build',
  RENOVATION: 'Renovation',
  INTERIOR: 'Interiors',
  COMMERCIAL: 'Commercial',
  OTHER: 'Something else',
}

export const BUDGET_LABELS = {
  'under-100k': 'Under €100k',
  '100k-250k': '€100k – €250k',
  '250k-500k': '€250k – €500k',
  '500k-1m': '€500k – €1m',
  'over-1m': 'Over €1m',
  undefined: 'Not yet defined',
}

export const TIMELINE_LABELS = {
  asap: 'As soon as possible',
  'within-6-months': 'Within 6 months',
  'within-12-months': 'Within 12 months',
  exploring: 'Still exploring',
}

export const INQUIRY_STATUS_LABELS = { NEW: 'New', READ: 'Read', REPLIED: 'Replied', ARCHIVED: 'Archived' }

/** Unknown enum values come back from the API as-is rather than rendering blank. */
export const label = (map, value, fallback = '—') =>
  value ? (map[String(value).toUpperCase()] ?? map[value] ?? String(value).replace(/_/g, ' ')) : fallback

export const categoryLabel = (value) => label(CATEGORY_LABELS, value)
export const statusLabel = (value) => label(PROJECT_STATUSES, value)

export const area = (sqm) => (sqm ? `${new Intl.NumberFormat('en-GB').format(sqm)} m²` : '—')

export const formatDate = (iso, options = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  iso ? new Intl.DateTimeFormat('en-GB', options).format(new Date(iso)) : '—'

export const formatDateTime = (iso) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const relativeDays = (iso) => {
  if (!iso) return '—'
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`

/** Slug → readable title for breadcrumbs and generated headings. */
export const humanize = (value = '') => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
