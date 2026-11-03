/**
 * Every optimised asset on this site ships as a four-file set:
 *   name.jpg  name.webp  name-sm.jpg  name-sm.webp   (1600w and 800w long edge)
 * Uploads written by server/src/lib/storage.js follow the same rule, so one
 * helper builds correct <picture> sources for both /img and /uploads paths.
 */

const WIDTHS = { large: 1600, small: 800 }

const isSitePath = (url) => typeof url === 'string' && (url.startsWith('/img/') || url.startsWith('/uploads/'))
const splitExt = (url) => (/\.(jpe?g|png|webp)$/i.test(url) ? url.replace(/\.[a-z]+$/i, '') : url)

/** Absolute URLs (a CDN) have no local variant set, so they pass through bare. */
export function variants(url) {
  if (!isSitePath(url)) {
    return { jpg: url, webp: url, smallJpg: url, smallWebp: url, external: true }
  }
  const base = splitExt(url)
  return {
    jpg: `${base}.jpg`,
    webp: `${base}.webp`,
    smallJpg: `${base}-sm.jpg`,
    smallWebp: `${base}-sm.webp`,
    external: false,
  }
}

/** `w` descriptors must be `<url> <width>w` — anything else is dropped by the parser. */
export function srcSet(url) {
  const { jpg, smallJpg, external } = variants(url)
  if (external) return undefined
  return `${smallJpg} ${WIDTHS.small}w, ${jpg} ${WIDTHS.large}w`
}

export function webpSrcSet(url) {
  const { webp, smallWebp, external } = variants(url)
  if (external) return undefined
  return `${smallWebp} ${WIDTHS.small}w, ${webp} ${WIDTHS.large}w`
}

/** A default that keeps full-bleed heroes from asking for 100vw on a phone. */
export const sizesFor = (layout = 'cover') => {
  if (layout === 'full') return '100vw'
  if (layout === 'half') return '(max-width: 900px) 100vw, 50vw'
  if (layout === 'third') return '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw'
  return '(max-width: 900px) calc(100vw - 3rem), 880px'
}

/** Intrinsic ratio from the stored width/height, so layout never shifts. */
export const aspectOf = (image) =>
  image?.width && image?.height ? `${image.width} / ${image.height}` : undefined
