import { useMemo, useState } from 'react'
import { adminApi } from '../admin-api.js'
import { useAdminData, useAdminMutation } from '../use-admin-data.js'
import { AdmEmpty, AdmError, AdmLoading, Field, Icon, Modal, useConfirm, useTitle, useToast } from '../ui.jsx'

const EMPTY = { quote: '', author: '', role: '', company: '', projectId: '', rating: 5, featured: false, published: true, sortOrder: 0 }

export default function TestimonialsPage() {
  useTitle('Testimonials')
  const toast = useToast()
  const confirm = useConfirm()
  const { execute, pending } = useAdminMutation()
  const { data, loading, error, reload } = useAdminData(() => adminApi.testimonials(), [])
  const { data: projectData } = useAdminData(() => adminApi.projects({ perPage: 100 }), [])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const projects = projectData?.projects ?? []

  const testimonials = useMemo(() => {
    const rows = data?.testimonials ?? []
    const term = search.trim().toLowerCase()
    return term ? rows.filter((row) => `${row.author} ${row.role} ${row.quote}`.toLowerCase().includes(term)) : rows
  }, [data, search])

  const toggle = async (item) => {
    const result = await execute(() => adminApi.updateTestimonial(item.id, { published: !item.published }))
    if (result.ok) { toast('Publication state updated.'); reload() }
    else toast(result.error?.message ?? 'Could not update the testimonial.', 'error')
  }

  const remove = async (item) => {
    const ok = await confirm({ title: 'Delete this testimonial?', body: `Remove the quote from ${item.author}.`, confirmLabel: 'Delete testimonial', danger: true })
    if (!ok) return
    const result = await execute(() => adminApi.deleteTestimonial(item.id))
    if (result.ok) { toast('Testimonial deleted.'); reload() }
    else toast(result.error?.message ?? 'Could not delete the testimonial.', 'error')
  }

  return (
    <div className="adm-stack">
      <div className="adm-gap" style={{ justifyContent: 'space-between' }}><div><p className="adm-eyebrow">Content</p><h1 className="adm-h" style={{ fontSize: '1.6rem' }}>Testimonials</h1></div><button className="adm-btn adm-btn--primary" onClick={() => setEditing({ ...EMPTY, sortOrder: data?.testimonials?.length ?? 0 })}><Icon name="plus" /> New testimonial</button></div>
      <div className="adm-toolbar"><div className="adm-search"><Icon name="search" /><label className="adm-visuallyhidden" htmlFor="testimonial-search">Search testimonials</label><input id="testimonial-search" className="adm-input" type="search" placeholder="Search author, role or quote…" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
      {loading ? <AdmLoading message="Loading testimonials…" /> : error ? <AdmError error={error} onRetry={reload} /> : testimonials.length === 0 ? <AdmEmpty title="No testimonials found" body={search ? 'Try a different search.' : 'Add a client quote to show it on the website.'} /> : (
        <div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Quote</th><th>Author</th><th>Project</th><th>Rating</th><th>State</th><th aria-label="Actions" /></tr></thead><tbody>
          {testimonials.map((item) => <tr key={item.id}>
            <td style={{ maxWidth: 380 }}><button className="adm-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => setEditing(item)}>“{item.quote.length > 115 ? `${item.quote.slice(0, 115)}…` : item.quote}”</button>{item.featured ? <div className="adm-cell-slug">Featured</div> : null}</td>
            <td><span className="adm-cell-title">{item.author}</span><div className="adm-cell-slug">{item.role}{item.company ? ` · ${item.company}` : ''}</div></td>
            <td className="adm-cell-2">{item.project?.title ?? 'Studio-wide'}</td><td className="adm-tabnum">{item.rating}/5</td>
            <td><span className={`adm-pill ${item.published ? 'adm-pill--live' : 'adm-pill--draft'}`}>{item.published ? 'Published' : 'Hidden'}</span></td>
            <td><div className="adm-actions"><button className="adm-btn adm-btn--sm" onClick={() => setEditing(item)} disabled={pending}>Edit</button><button className="adm-btn adm-btn--sm" onClick={() => toggle(item)} disabled={pending}>{item.published ? 'Hide' : 'Publish'}</button><button className="adm-btn adm-btn--sm adm-btn--danger adm-btn--icon" onClick={() => remove(item)} disabled={pending} aria-label={`Delete testimonial by ${item.author}`}><Icon name="trash" /></button></div></td>
          </tr>)}
        </tbody></table></div>
      )}
      {editing ? <TestimonialModal item={editing} projects={projects} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} /> : null}
    </div>
  )
}

function TestimonialModal({ item, projects, onClose, onSaved }) {
  const isNew = !item.id
  const toast = useToast()
  const { execute, pending } = useAdminMutation()
  const [form, setForm] = useState({ ...EMPTY, ...item, projectId: item.projectId ?? '', company: item.company ?? '' })
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const save = async (event) => {
    event.preventDefault()
    const payload = { quote: form.quote, author: form.author, role: form.role, company: form.company.trim() || null, projectId: form.projectId || null, rating: Number(form.rating), featured: form.featured, published: form.published, sortOrder: Number(form.sortOrder) }
    const result = await execute(() => (isNew ? adminApi.createTestimonial(payload) : adminApi.updateTestimonial(item.id, payload)))
    if (!result.ok) { setErrors(result.error?.fields ?? {}); toast(result.error?.message ?? 'Could not save the testimonial.', 'error'); return }
    toast(isNew ? 'Testimonial created.' : 'Testimonial updated.')
    onSaved()
  }
  return (
    <Modal title={isNew ? 'New testimonial' : `Edit ${item.author}`} onClose={onClose} wide footer={<><button className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn adm-btn--primary" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save testimonial'}</button></>}>
      <form className="adm-form" onSubmit={save} noValidate>
        <Field label="Quote" htmlFor="t-quote" required error={errors.quote}><textarea id="t-quote" className="adm-textarea adm-textarea--tall" value={form.quote} onChange={set('quote')} minLength={30} maxLength={900} /></Field>
        <div className="adm-row2"><Field label="Author" htmlFor="t-author" required error={errors.author}><input id="t-author" className="adm-input" value={form.author} onChange={set('author')} /></Field><Field label="Role" htmlFor="t-role" required error={errors.role}><input id="t-role" className="adm-input" value={form.role} onChange={set('role')} /></Field></div>
        <div className="adm-row2"><Field label="Company" htmlFor="t-company" error={errors.company}><input id="t-company" className="adm-input" value={form.company} onChange={set('company')} /></Field><Field label="Related project" htmlFor="t-project" error={errors.projectId}><select id="t-project" className="adm-select" value={form.projectId} onChange={set('projectId')}><option value="">Studio-wide</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></Field></div>
        <div className="adm-row3"><Field label="Rating" htmlFor="t-rating" error={errors.rating}><select id="t-rating" className="adm-select" value={form.rating} onChange={set('rating')}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></Field><Field label="Sort order" htmlFor="t-sort" error={errors.sortOrder}><input id="t-sort" className="adm-input" type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} /></Field><div className="adm-stack" style={{ gap: 8 }}><label className="adm-check"><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured</label><label className="adm-check"><input type="checkbox" checked={form.published} onChange={set('published')} /> Published</label></div></div>
        <button type="submit" className="adm-visuallyhidden" tabIndex={-1}>Save</button>
      </form>
    </Modal>
  )
}
