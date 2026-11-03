import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * One-shot data fetch with the three states every page in this brief needs.
 * `deps` re-runs the loader (used by the project filters and pagination).
 */
export function useApi(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }))
    let alive = true
    Promise.resolve(loader())
      .then((data) => {
        if (alive && mounted.current) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (alive && mounted.current) setState({ data: null, loading: false, error })
      })
    return () => {
      alive = false
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => run(), [run])

  const reload = useCallback(() => run(), [run])
  return { ...state, reload }
}

/**
 * Adds `.is-in` once an element scrolls into view. CSS owns the transition,
 * and the observer disconnects per element so long lists stay cheap.
 */
export function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal:not(.is-in)').forEach((node) => node.classList.add('is-in'))
      return
    }

    const nodes = document.querySelectorAll('.reveal:not(.is-in)')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  })
}

/** Scroll position → the boolean the sticky header uses to flip to solid. */
export function useScrolled(offset = 24) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])
  return scrolled
}

const setTitle = (title) => {
  document.title = title
  const meta = document.querySelector('meta[name="title"]') ?? document.createElement('meta')
  meta.setAttribute('name', 'title')
  meta.setAttribute('content', title)
  if (!meta.parentNode) document.head.appendChild(meta)
}

const setMeta = (name, content) => {
  if (!content) return
  let tag = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(name.startsWith('og:') ? 'property' : 'name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

const setCanonical = (href) => {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

/** Per-route SEO metadata, including the Open Graph pair the brief asks for. */
export function useSeo({ title, description, image, path, type = 'website' }) {
  useEffect(() => {
    const full = title?.includes('FORMA') ? title : `${title} — FORMA Studio`
    setTitle(full)
    setMeta('description', description)
    setMeta('og:title', full)
    setMeta('og:description', description)
    setMeta('og:type', type)
    setMeta('og:image', image)
    setMeta('twitter:card', image ? 'summary_large_image' : 'summary')
    setMeta('twitter:title', full)
    setMeta('twitter:description', description)
    setMeta('twitter:image', image)
    if (path) setCanonical(new URL(path, window.location.origin).href)
  }, [title, description, image, path, type])
}

/** Locks background scrolling via body.is-locked, which the stylesheet defines. */
export function useBodyLock(active) {
  useEffect(() => {
    document.body.classList.toggle('is-locked', Boolean(active))
    return () => document.body.classList.remove('is-locked')
  }, [active])
}
