import { Link, useParams } from 'react-router-dom'
import Photo from '../components/Photo.jsx'
import Reveal from '../components/Reveal.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import TestimonialDeck from '../components/TestimonialDeck.jsx'
import ArrowLink from '../components/ArrowLink.jsx'
import { ErrorState, Loading, SkeletonPhoto, SkeletonRows } from '../components/StateBlock.jsx'
import { publicApi } from '../lib/api.js'
import { useApi, useSeo } from '../lib/hooks.js'
import { area, categoryLabel, statusLabel } from '../lib/format.js'
import '../styles/project-detail.css'

export default function ProjectDetail() {
  const { slug } = useParams()
  const data = useApi(() => publicApi.project(slug), [slug])
  const project = data.data?.project
  const nav = data.data?.navigation
  const related = useApi(
    () => (project ? publicApi.projects({ category: project.category, perPage: 4 }) : Promise.resolve({ projects: [] })),
    [project?.id],
  )

  useSeo({
    title: project ? `${project.title} — ${categoryLabel(project.category)}` : 'Project',
    description: project?.excerpt,
    image: project?.coverImageUrl,
    path: `/projects/${slug}`,
    type: 'article',
  })

  if (data.loading) {
    return (
      <div className="wrap section" style={{ paddingTop: 'calc(var(--header-h) + 90px)' }}>
        <Loading message="Loading the project…" />
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="wrap section" style={{ paddingTop: 'calc(var(--header-h) + 90px)' }}>
        <ErrorState error={data.error} onRetry={data.reload} />
        <p style={{ marginTop: 26 }}>
          <ArrowLink to="/projects">Back to all projects</ArrowLink>
        </p>
      </div>
    )
  }

  if (!project) return null

  const paragraphs = String(project.description ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  return (
    <article>
      <header className="wrap pd-head">
        <div className="pd-head__top">
          <p className="pd-crumb">
            <Link to="/projects">Projects</Link>
            <span aria-hidden="true">/</span>
            <span>{categoryLabel(project.category)}</span>
          </p>
          <p className="label">{statusLabel(project.status)}</p>
        </div>

        <h1 className="pd-title display">{project.title}</h1>

        <p className="pd-sub">
          <span>{project.location}{project.country ? `, ${project.country}` : ''}</span>
          <span aria-hidden="true">·</span>
          <span className="num">{project.year}</span>
          <span aria-hidden="true">·</span>
          <span>{area(project.areaSqm)}</span>
        </p>
      </header>

      <div className="wrap">
        <div className="pd-opener">
          <Photo src={project.coverImageUrl} alt={project.coverImageAlt} layout="full" eager />
        </div>

        <div className="pd-body">
          <aside className="pd-side" aria-label="Project facts">
            <dl className="meta">
              <div><dt>Category</dt><dd>{categoryLabel(project.category)}</dd></div>
              <div><dt>Status</dt><dd>{statusLabel(project.status)}</dd></div>
              <div><dt>Place</dt><dd>{project.location}, {project.country}</dd></div>
              <div><dt>Year</dt><dd className="num">{project.year}</dd></div>
              <div><dt>Area</dt><dd>{area(project.areaSqm)}</dd></div>
              {project.client && <div><dt>Client</dt><dd>{project.client}</dd></div>}
              {project.materials?.length > 0 && (
                <div><dt>Materials</dt><dd>{project.materials.join(', ')}</dd></div>
              )}
            </dl>
            <ArrowLink to="/contact">Commission something like this</ArrowLink>
          </aside>

          <div className="pd-narrative">
            {paragraphs.map((text, index) => (
              <Reveal key={index} delay={index * 70}>
                <p>{text}</p>
              </Reveal>
            ))}

            {project.tags?.length > 0 && (
              <div className="pd-tags" aria-label="Tags">
                {project.tags.map((tag) => (
                  <span className="tag" key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- gallery ---------- */}
        <section className="pd-gallery" aria-label="Photographs">
          {project.images?.length > 0 ? (
            <div className="mosaic">
              {project.images.map((image, index) => (
                <figure className="mosaic-item pd-figure" key={image.id}>
                  <Photo
                    src={image.url}
                    alt={image.alt || `${project.title} — view ${index + 1}`}
                    width={image.width}
                    height={image.height}
                    eager={index === 0}
                  />
                  <figcaption className="figure-cap">
                    <span className="label num">{String(index + 1).padStart(2, '0')}</span>
                    <span>{image.caption ?? image.alt ?? project.title}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="quiet">Photographs for this project are being prepared.</p>
          )}
        </section>

        {/* ---------- project testimonials ---------- */}
        {project.testimonials?.length > 0 && (
          <section className="section section--tight" aria-label="What the client said">
            <TestimonialDeck testimonials={project.testimonials} />
          </section>
        )}

        {/* ---------- prev / next ---------- */}
        {nav && (
          <nav className="pd-pager" aria-label="More projects">
            <Link to={`/projects/${nav.previous.slug}`} className="pd-pager__link pd-pager__link--prev">
              <span className="pd-pager__label">← Previous</span>
              <span className="pd-pager__title">{nav.previous.title}</span>
              <span className="field-hint">{categoryLabel(nav.previous.category)}</span>
            </Link>
            <Link to={`/projects/${nav.next.slug}`} className="pd-pager__link pd-pager__link--next">
              <span className="pd-pager__label">Next →</span>
              <span className="pd-pager__title">{nav.next.title}</span>
              <span className="field-hint">{categoryLabel(nav.next.category)}</span>
            </Link>
          </nav>
        )}

        {/* ---------- related ---------- */}
        <section className="section section--tight" aria-labelledby="related">
          <div className="side-by-side" style={{ justifyContent: 'space-between', marginBottom: 'clamp(24px,3vw,40px)' }}>
            <h2 id="related">More {categoryLabel(project.category).toLowerCase()}</h2>
            <ArrowLink to="/projects">All projects</ArrowLink>
          </div>

          {related.loading && (
            <div className="mosaic">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="mosaic-item" key={index}><SkeletonPhoto /><SkeletonRows rows={1} height={16} /></div>
              ))}
            </div>
          )}

          {related.data && (
            <div className="mosaic">
              {related.data.projects
                .filter((item) => item.slug !== project.slug)
                .slice(0, 3)
                .map((item) => (
                  <ProjectCard key={item.id} project={item} />
                ))}
            </div>
          )}

          <div className="cta-strip">
            <div>
              <p className="label label--ink">Your project</p>
              <h2 style={{ marginTop: 14 }}>Tell us about your site.</h2>
            </div>
            <Link className="btn btn--clay" to={`/contact?subject=${encodeURIComponent(`${project.title} — similar brief`)}`}>
              Start an enquiry
            </Link>
          </div>
        </section>
      </div>
    </article>
  )
}
