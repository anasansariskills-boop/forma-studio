import { Link } from 'react-router-dom'
import Photo from './Photo.jsx'
import { area, categoryLabel, statusLabel } from '../lib/format.js'

/** Mosaic figure used by the portfolio grid. */
export default function ProjectCard({ project, eager = false }) {
  return (
    <article className="mosaic-item">
      <Link to={`/projects/${project.slug}`} className="photo photo--hover" aria-label={project.title}>
        <Photo src={project.coverImageUrl} alt={project.coverImageAlt} eager={eager} />
      </Link>
      <div className="mosaic-cap">
        <h3>
          <Link to={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>
        <p className="label">
          {categoryLabel(project.category)}
          <br />
          {project.location} · {project.year}
        </p>
      </div>
      <p className="quiet" style={{ fontSize: 'var(--fs-small)' }}>
        {project.excerpt}
      </p>
      <p className="field-hint">
        {statusLabel(project.status)} · {area(project.areaSqm)}
      </p>
    </article>
  )
}
