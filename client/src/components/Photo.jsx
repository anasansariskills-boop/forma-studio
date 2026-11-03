import { sizesFor, srcSet, webpSrcSet, variants } from '../lib/images.js'

/**
 * Responsive picture with the WebP/JPEG variant pair the server emits.
 * `layout` picks the sizes hint; `priority` opts out of lazy loading for the
 * above-the-fold image so LCP is not waiting on the intersection observer.
 */
export default function Photo({
  src,
  alt,
  layout = 'cover',
  className = '',
  sizes,
  eager = false,
  width,
  height,
  fetchpriority,
  loading,
  ...rest
}) {
  if (!src) {
    return <span className={`photo skeleton ${className}`.trim()} role="presentation" aria-hidden="true" {...rest} />
  }

  const v = variants(src)
  const external = v.external

  return (
    <picture className={`photo ${className}`}>
      {!external && (
        <source type="image/webp" srcSet={webpSrcSet(src)} sizes={sizes ?? sizesFor(layout)} width={width} height={height} />
      )}
      <img
        src={v.jpg}
        srcSet={external ? undefined : srcSet(src)}
        sizes={external ? undefined : (sizes ?? sizesFor(layout))}
        alt={alt ?? ''}
        width={width}
        height={height}
        loading={loading ?? (eager ? 'eager' : 'lazy')}
        decoding="async"
        fetchPriority={fetchpriority ?? (eager ? 'high' : 'auto')}
        {...rest}
      />
    </picture>
  )
}
