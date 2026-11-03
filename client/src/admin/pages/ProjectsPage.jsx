import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi } from '../admin-api.js'
import { useAdminData, useAdminMutation } from '../use-admin-data.js'
import { CATEGORY_LABELS, statusLabel, categoryLabel, pluralize, relativeDays } from '../../lib/format.js'
import { variants } from '../../lib/images.js'
import { AdmEmpty, AdmError, AdmLoading, Icon, Pagination, useConfirm, useToast, useTitle } from '../ui.jsx'

const PER_PAGE = 15

export default function ProjectsPage() {
  useTitle('Projects')
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { execute, pending } = useAdminMutation()

  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [published, setPublished] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchDraft.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [searchDraft])

  useEffect(() => setPage(1), [category, published])

  const { data, loading, error, reload } = useAdminData(
    () => adminApi.projects({ search: search || undefined, category: category || undefined, published: published || undefined, page, perPage: PER_PAGE }),
    [search, category, published, page],
  )

  const projects = data?.projects ?? []
  const total = data?.pagination?.total ?? 0

  const togglePublish = async (project) => {
    const result = await execute(() => adminApi.updateProject(project.id, { published: !project.published }))
    if (result.ok) toast(`“${project.title}” is now ${project.published ? 'a draft' : 'published'}.`)
    else toast(result.error?.message ?? 'Could not update that project.', 'error')
    reload()
  }

  const remove = async (project) => {
    const ok = await confirm({
      title: 'Delete this project?',
      body: `You are permanently deleting “${project.title}”.`,
      detail: 'This also removes every gallery image file from storage. It cannot be undone.',
      confirmLabel: 'Delete project',
      danger: true,
    })
    if (!ok) return
    const result = await execute(() => adminApi.deleteProject(project.id))
    if (result.ok) {
      toast(`Deleted “${project.title}”.`)
      reload()
    } else toast(result.error?.message ?? 'Could not delete that project.', 'error')
  }

  return (
    <div className="adm-stack">
      <div className="adm-gap" style={{ justifyContent: 'space-between' }}>
        <div>
          <p className="adm-eyebrow">Content</p>
          <h2 className="adm-h" style={{ fontSize: '1.6rem' }}>Projects</h2>
        </div>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => navigate('new')}>
          <Icon name="plus" /> New project
        </button>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search">
          <Icon name="search" />
          <label className="adm-visuallyhidden" htmlFor="proj-search">Search projects</label>
          <input
            id="proj-search"
            className="adm-input"
            type="search"
            placeholder="Search title, slug or location…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>
        <div className="adm-field" style={{ gap: 0 }}>
          <label className="adm-visuallyhidden" htmlFor="proj-cat">Category</label>
          <select id="proj-cat" className="adm-select adm-select--filter" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="adm-field" style={{ gap: 0 }}>
          <label className="adm-visuallyhidden" htmlFor="proj-state">State</label>
          <select id="proj-state" className="adm-select adm-select--filter" value={published} onChange={(e) => setPublished(e.target.value)}>
            <option value="">Published & drafts</option>
            <option value="true">Published only</option>
            <option value="false">Drafts only</option>
          </select>
        </div>
      </div>

      <p className="adm-help" role="status" aria-live="polite" style={{ minHeight: 18 }}>
        {loading ? 'Searching…' : data ? `${pluralize(total, 'project')} found` : ''}
      </p>

      {loading ? (
        <AdmLoading message="Loading projects…" />
      ) : error ? (
        <AdmError error={error} onRetry={reload} />
      ) : projects.length === 0 ? (
        <AdmEmpty
          title="No projects match those filters"
          body="Try clearing the search or switching the category / state filters."
          action={<button className="adm-btn" onClick={() => { setSearchDraft(''); setCategory(''); setPublished('') }}>Clear filters</button>}
        />
      ) : (
        <>
          <div className="adm-table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th className="num-col">Year</th>
                  <th className="num-col">Images</th>
                  <th>State</th>
                  <th>Updated</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="adm-cell-title adm-link" to={`/admin/projects/${p.id}`}>{p.title}</Link>
                      <div className="adm-cell-slug">/{p.slug}</div>
                    </td>
                    <td className="adm-cell-2">{categoryLabel(p.category)}</td>
                    <td className="adm-cell-2">{statusLabel(p.status)}</td>
                    <td className="num-col adm-tabnum">{p.year}</td>
                    <td className="num-col adm-tabnum">{p._count?.images ?? 0}</td>
                    <td>
                      <span className="adm-gap" style={{ gap: 5 }}>
                        <span className={`adm-pill ${p.published ? 'adm-pill--live' : 'adm-pill--draft'}`}>{p.published ? 'Published' : 'Draft'}</span>
                        {p.featured ? <span className="adm-pill adm-pill--featured">Featured</span> : null}
                      </span>
                    </td>
                    <td className="adm-cell-2 adm-tabnum">{relativeDays(p.updatedAt)}</td>
                    <td>
                      <div className="adm-actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn--sm adm-btn--ghost"
                          onClick={() => togglePublish(p)}
                          disabled={pending}
                          aria-label={`Toggle ${p.published ? 'unpublish' : 'publish'} ${p.title}`}
                        >
                          {p.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button type="button" className="adm-btn adm-btn--sm adm-btn--danger adm-btn--icon" onClick={() => remove(p)} disabled={pending} aria-label={`Delete ${p.title}`}>
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data?.pagination} onPage={setPage} />
        </>
      )}
    </div>
  )
}
