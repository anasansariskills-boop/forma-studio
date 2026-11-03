import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const Arrow = ({ back = false }) => (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
    <path
      d={back ? 'M17 6H1M6 1L1 6l5 5' : 'M1 6h16M12 1l5 5-5 5'}
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="square"
    />
  </svg>
)

/**
 * Testimonial slider. Auto-advance is a nicety, not a dependency: it pauses on
 * hover and focus, and stops entirely under prefers-reduced-motion.
 */
export default function TestimonialDeck({ testimonials = [], invert = false }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = testimonials.length

  const go = useCallback((next) => setIndex(((next % count) + count) % count), [count])

  useEffect(() => {
    if (paused || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), 7000)
    return () => window.clearInterval(timer)
  }, [paused, count])

  useEffect(() => setIndex(0), [count])

  if (count === 0) return null
  const item = testimonials[index]

  return (
    <div
      className={`deck ${invert ? 'invert' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <figure className="deck-slide" key={item.id}>
        <blockquote className="quote">“{item.quote}”</blockquote>
        <figcaption className="quote-src">
          <span className="label label--ink">{item.author}</span>
          <span>
            {item.role}
            {item.company ? `, ${item.company}` : ''}
          </span>
          {item.project?.slug && (
            <span>
              <Link to={`/projects/${item.project.slug}`}>{item.project.title}</Link>
            </span>
          )}
        </figcaption>
      </figure>

      {count > 1 && (
        <div className="deck-nav">
          <button type="button" className="deck-btn" onClick={() => go(index - 1)} aria-label="Previous testimonial">
            <Arrow back />
          </button>
          <button type="button" className="deck-btn" onClick={() => go(index + 1)} aria-label="Next testimonial">
            <Arrow />
          </button>
          <div className="deck-dots" role="tablist" aria-label="Choose testimonial">
            {testimonials.map((testimonial, dot) => (
              <button
                key={testimonial.id}
                type="button"
                role="tab"
                aria-selected={dot === index}
                aria-label={`Testimonial ${dot + 1}`}
                className={`deck-dot ${dot === index ? 'is-on' : ''}`}
                onClick={() => go(dot)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
