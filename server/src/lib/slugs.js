/** URL-safe slug from a human title. */
export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’&+]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Appends -2, -3 … until the candidate is free in the given model. */
export async function uniqueSlug(model, field, base, { excludeId } = {}) {
  const root = slugify(base) || 'untitled'
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`
    const existing = await model.findFirst({
      where: {
        [field]: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!existing) return candidate
  }
  return `${root}-${Date.now().toString(36)}`
}
