import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Photo from './Photo.jsx'
import { categoryLabel, statusLabel } from '../lib/format.js'

const prefersFinePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Editorial project list. On a pointer device the cover follows the cursor as a
 * floating preview; on touch (and under 900px) each row shows an inline thumb,
 * which the stylesheet reveals — the two paths are never both visible.
 */
export default function ProjectIndex({ projects, startAt = 1 }) {
  const [fine] = useState(prefersFinePointer)
  const [hovered, setHovered] = useState(null)
  const [point, setPoint] = useState({ x: 0, y: 0 })

  const move = useCallback((event) => {
    setPoint({
      x: Math.min(Math.max(event.clientX, 130), window.innerWidth - 130),
      y: Math.min(Math.max(event.clientY, 100), window.innerHeight - 100),
    })
  }, [])

  useEffect(() => {
    if (!fine) return
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [fine, move])

  return (
    <>
      <ol className="index">
        {projects.map((project, index) => (
          <li key={project.id}>
            <Link
              to={`/projects/${project.slug}`}
              className="index-row"
              onMouseEnter={fine ? () => setHovered(project) : undefined}
              onMouseLeave={fine ? () => setHovered(null) : undefined}
            >
              <span className="index-i num">{String(startAt + index).padStart(2, '0')}</span>
              <span className="index-title">{project.title}</span>
              <span className="index-meta">
                {categoryLabel(project.category)} · {statusLabel(project.status)}
              </span>
              <span className="index-year num">{project.year}</span>
              <span className="index-arrow" aria-hidden="true">
                →
              </span>
              <span className="index-thumb">
                <Photo src={project.coverImageUrl} alt="" layout="cover" />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {fine && (
        <div
          className={`index-preview ${hovered ? 'is-on' : ''}`}
          style={{ '--px': `${point.x - 120}px`, '--py': `${point.y - 84}px` }}
          aria-hidden="true"
        >
          {hovered && <img src={hovered.coverImageUrl} alt="" loading="lazy" decoding="async" />}
        </div>
      )}
    </>
  )
}
