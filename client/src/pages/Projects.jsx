import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import FilterBar from '../components/FilterBar.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import ProjectIndex from '../components/ProjectIndex.jsx'
import { ErrorState, SkeletonPhoto, SkeletonRows } from '../components/StateBlock.jsx'
import { publicApi } from '../lib/api.js'
import { useApi, useSeo } from '../lib/hooks.js'
import { pluralize } from '../lib/format.js'
import '../styles/projects.css'

const SORTS = [
  ['manual', 'Studio order'],
  ['recent', 'Most recent'],
  ['oldest', 'Oldest'],
  ['title', 'A–Z'],
]

export default function Projects() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'ALL'
  const search = params.get('search') ?? ''
  const sort = params.get('sort') ?? 'manual'
  const page = Math.max(1, Number(params.get('page') ?? 1))
  const view = params.get('view') === 'index' ? 'index' : 'grid'

  const [term, setTerm] = useState(search)

  // Typing should not push a history entry per keystroke.
  useEffect(() => {
    if (term === search) return
    const timer = window.setTimeout(() => patch({ search: term || null, page: null }), 420)
    return () => window.clearTimeout(timer)
  }, [term]) // eslint-disable-line react-hooks/exhaustive-deps

  // Functional update: reading `params` from render scope would let two quick
  // changes (type + click a filter) clobber each other.
  const patch = (changes) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '' || value === 'ALL') next.delete(key)
        else next.set(key, String(value))
      }
      return next
    }, { replace: true })
  }

  const query = useMemo(
    () => ({ category: category === 'ALL' ? undefined : category, search: search || undefined, sort, page, perPage: 9 }),
    [category, search, sort, page],
  )

  const data = useApi(() => publicApi.projects(query), [query])

  useSeo({
    title: 'Projects — FORMA Studio',
    description: `Architecture, interiors and renovation work across Portugal — ${
      data.data ? pluralize(data.data.pagination.total, 'published project') : 'a growing portfolio'
    }.`,
    image: data.data?.projects?.[0]?.coverImageUrl,
    path: '/projects',
  })

  const total = data.data?.pagination.total ?? 0
  const projects = data.data?.projects ?? []

  return (
    <>
      <Hero
        variant="title"
        kicker="Portfolio"
        title="Every building we have finished, and a few still being argued about."
        lead="Filter by discipline, search a location or a material, or read the list end to end. Each project page carries the brief, the numbers and the photographs."
        count={data.data ? `${pluralize(total, 'project')}${search ? ` matching “${search}”` : ''}` : '—'}
      />

      <div className="wrap">
        <div className="pj-toolbar">
          <FilterBar
            categories={data.data?.categories ?? {}}
            active={category}
            total={data.data?.categories ? Object.values(data.data.categories).reduce((a, b) => a + b, 0) : 0}
            onChange={(next) => patch({ category: next, page: null })}
          />

          <div className="pj-search">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="6.2" cy="6.2" r="5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <label htmlFor="pj-q" className="sr-only">Search projects</label>
            <input
              id="pj-q"
              type="search"
              value={term}
              placeholder="Search title, place or tag"
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>

          <label className="pj-sort">
            Sort
            <select value={sort} onChange={(event) => patch({ sort: event.target.value, page: null })} aria-label="Sort projects">
              {SORTS.map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>
          </label>

          <div className="pj-views" role="group" aria-label="Change layout">
            <button type="button" className={`pj-view ${view === 'grid' ? 'is-on' : ''}`} aria-pressed={view === 'grid'} onClick={() => patch({ view: null })}>
              Grid
            </button>
            <button type="button" className={`pj-view ${view === 'index' ? 'is-on' : ''}`} aria-pressed={view === 'index'} onClick={() => patch({ view: 'index' })}>
              List
            </button>
          </div>
        </div>
      </div>

      <section className="pj-results wrap" aria-live="polite" aria-busy={data.loading}>
        {data.loading && (
          view === 'grid'
            ? <div className="mosaic">{Array.from({ length: 3 }).map((_, index) => <div className="mosaic-item" key={index}><SkeletonPhoto /><SkeletonRows rows={2} height={16} /></div>)}</div>
            : <SkeletonRows rows={6} height={78} />
        )}

        {data.error && <ErrorState error={data.error} onRetry={data.reload} />}

        {data.data && projects.length === 0 && (
          <div className="pj-empty">
            <p className="h3">No projects match that.</p>
            <p className="quiet measure">
              {search
                ? `Nothing in the portfolio mentions “${search}”${category === 'ALL' ? '' : ' in this category'}.`
                : 'This category is empty right now.'}
            </p>
            <button type="button" className="btn" onClick={() => { setTerm(''); patch({ search: null, category: null, page: null }) }}>
              Clear filters
            </button>
          </div>
        )}

        {data.data && projects.length > 0 && view === 'grid' && (
          <div className="mosaic">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} eager={index < 2 && page === 1} />
            ))}
          </div>
        )}

        {data.data && projects.length > 0 && view === 'index' && (
          <ProjectIndex projects={projects} startAt={(page - 1) * 9 + 1} />
        )}

        {data.data && data.data.pagination.pages > 1 && (
          <nav className="pj-pager" aria-label="Pagination">
            <button
              type="button"
              className="btn"
              disabled={page <= 1}
              onClick={() => { patch({ page: page - 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              Previous
            </button>
            <p className="pj-pager-info">
              Page {data.data.pagination.page} of {data.data.pagination.pages} —{' '}
              {(page - 1) * 9 + 1}–{Math.min(page * 9, total)} of {total}
            </p>
            <button
              type="button"
              className="btn"
              disabled={page >= data.data.pagination.pages}
              onClick={() => { patch({ page: page + 1 }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <section className="wrap section section--tight">
        <div className="cta-strip">
          <div>
            <p className="label label--ink">Commission</p>
            <h2 style={{ marginTop: 14 }}>Most of these started as a two-line email.</h2>
          </div>
          <Link className="btn btn--clay" to="/contact">Write to the studio</Link>
        </div>
      </section>
    </>
  )
}
