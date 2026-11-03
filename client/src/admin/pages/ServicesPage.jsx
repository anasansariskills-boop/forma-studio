import { useMemo, useState } from 'react'
import { adminApi } from '../admin-api.js'
import { useAdminData, useAdminMutation } from '../use-admin-data.js'
import { AdmEmpty, AdmError, AdmLoading, Field, Icon, Modal, TagInput, useConfirm, useTitle, useToast } from '../ui.jsx'

const EMPTY = {
  slug: '', title: '', discipline: '', excerpt: '', description: '', scope: [], detail: [],
  imageUrl: '/img/services/architecture.jpg', imageAlt: '', sortOrder: 0, published: true,
}

export default function ServicesPage() {
  useTitle('Services')
  const toast = useToast()
  const confirm = useConfirm()
  const { execute, pending } = useAdminMutation()
  const { data, loading, error, reload } = useAdminData(() => adminApi.services(), [])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const services = useMemo(() => {
    const rows = data?.services ?? []
    const term = search.trim().toLowerCase()
    return term ? rows.filter((row) => `${row.title} ${row.discipline} ${row.excerpt}`.toLowerCase().includes(term)) : rows
  }, [data, search])

  const toggle = async (service) => {
    const result = await execute(() => adminApi.updateService(service.id, { published: !service.published }))
    if (result.ok) { toast(`“${service.title}” ${service.published ? 'unpublished' : 'published'}.`); reload() }
    else toast(result.error?.message ?? 'Could not update the service.', 'error')
  }

  const remove = async (service) => {
    const ok = await confirm({ title: 'Delete this service?', body: `Permanently delete “${service.title}”.`, confirmLabel: 'Delete service', danger: true })
    if (!ok) return
    const result = await execute(() => adminApi.deleteService(service.id))
    if (result.ok) { toast('Service deleted.'); reload() }
    else toast(result.error?.message ?? 'Could not delete the service.', 'error')
  }

  return (
    <div className="adm-stack">
      <div className="adm-gap" style={{ justifyContent: 'space-between' }}>
        <div><p className="adm-eyebrow">Content</p><h1 className="adm-h" style={{ fontSize: '1.6rem' }}>Services</h1></div>
        <button className="adm-btn adm-btn--primary" onClick={() => setEditing({ ...EMPTY, sortOrder: data?.services?.length ?? 0 })}><Icon name="plus" /> New service</button>
      </div>
      <div className="adm-toolbar">
        <div className="adm-search"><Icon name="search" /><label className="adm-visuallyhidden" htmlFor="service-search">Search services</label><input id="service-search" className="adm-input" type="search" placeholder="Search services…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      {loading ? <AdmLoading message="Loading services…" /> : error ? <AdmError error={error} onRetry={reload} /> : services.length === 0 ? (
        <AdmEmpty title="No services found" body={search ? 'Try a different search.' : 'Create the first service to publish on the website.'} />
      ) : (
        <div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Service</th><th>Discipline</th><th>Scope</th><th>Order</th><th>State</th><th aria-label="Actions" /></tr></thead><tbody>
          {services.map((service) => <tr key={service.id}>
            <td><button className="adm-cell-title adm-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => setEditing(service)}>{service.title}</button><div className="adm-cell-slug">/{service.slug}</div></td>
            <td className="adm-cell-2">{service.discipline}</td><td className="adm-cell-2">{service.scope?.length ?? 0} items</td><td className="adm-tabnum">{service.sortOrder}</td>
            <td><span className={`adm-pill ${service.published ? 'adm-pill--live' : 'adm-pill--draft'}`}>{service.published ? 'Published' : 'Hidden'}</span></td>
            <td><div className="adm-actions"><button className="adm-btn adm-btn--sm" onClick={() => setEditing(service)} disabled={pending}>Edit</button><button className="adm-btn adm-btn--sm" onClick={() => toggle(service)} disabled={pending}>{service.published ? 'Hide' : 'Publish'}</button><button className="adm-btn adm-btn--sm adm-btn--danger adm-btn--icon" onClick={() => remove(service)} disabled={pending} aria-label={`Delete ${service.title}`}><Icon name="trash" /></button></div></td>
          </tr>)}
        </tbody></table></div>
      )}
      {editing ? <ServiceModal service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} /> : null}
    </div>
  )
}

function ServiceModal({ service, onClose, onSaved }) {
  const isNew = !service.id
  const toast = useToast()
  const { execute, pending } = useAdminMutation()
  const [form, setForm] = useState({ ...EMPTY, ...service })
  const [errors, setErrors] = useState({})
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const save = async (event) => {
    event.preventDefault()
    const payload = { ...form, slug: form.slug.trim() || undefined, sortOrder: Number(form.sortOrder) }
    delete payload.id
    for (const key of ['createdAt', 'updatedAt']) delete payload[key]
    const result = await execute(() => (isNew ? adminApi.createService(payload) : adminApi.updateService(service.id, payload)))
    if (!result.ok) { setErrors(result.error?.fields ?? {}); toast(result.error?.message ?? 'Could not save the service.', 'error'); return }
    toast(isNew ? 'Service created.' : 'Service updated.')
    onSaved()
  }
  return (
    <Modal title={isNew ? 'New service' : `Edit ${service.title}`} onClose={onClose} wide footer={<><button className="adm-btn" onClick={onClose}>Cancel</button><button className="adm-btn adm-btn--primary" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save service'}</button></>}>
      <form className="adm-form" onSubmit={save} noValidate>
        <div className="adm-row2"><Field label="Title" htmlFor="s-title" required error={errors.title}><input id="s-title" className="adm-input" value={form.title} onChange={set('title')} /></Field><Field label="Slug" htmlFor="s-slug" error={errors.slug}><input id="s-slug" className="adm-input" value={form.slug} onChange={set('slug')} placeholder="Generated from title if blank" /></Field></div>
        <Field label="Discipline" htmlFor="s-discipline" required error={errors.discipline}><input id="s-discipline" className="adm-input" value={form.discipline} onChange={set('discipline')} placeholder="Buildings, interiors, workplaces…" /></Field>
        <Field label="Short excerpt" htmlFor="s-excerpt" required error={errors.excerpt}><textarea id="s-excerpt" className="adm-textarea" value={form.excerpt} onChange={set('excerpt')} maxLength={240} /></Field>
        <Field label="Description" htmlFor="s-description" required error={errors.description}><textarea id="s-description" className="adm-textarea adm-textarea--tall" value={form.description} onChange={set('description')} /></Field>
        <Field label="What it covers" htmlFor="s-scope" error={errors.scope}><TagInput id="s-scope" value={form.scope} onChange={(value) => setForm((current) => ({ ...current, scope: value }))} /></Field>
        <Field label="Notes & conditions" htmlFor="s-detail" error={errors.detail}><TagInput id="s-detail" value={form.detail} onChange={(value) => setForm((current) => ({ ...current, detail: value }))} /></Field>
        <Field label="Image URL" htmlFor="s-image" error={errors.imageUrl}><input id="s-image" className="adm-input" value={form.imageUrl} onChange={set('imageUrl')} /></Field>
        <Field label="Image alt text" htmlFor="s-alt" error={errors.imageAlt}><input id="s-alt" className="adm-input" value={form.imageAlt} onChange={set('imageAlt')} /></Field>
        <div className="adm-row2"><Field label="Sort order" htmlFor="s-sort" error={errors.sortOrder}><input id="s-sort" className="adm-input" type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} /></Field><label className="adm-check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={form.published} onChange={set('published')} /> Published on the website</label></div>
        <button type="submit" className="adm-visuallyhidden" tabIndex={-1}>Save</button>
      </form>
    </Modal>
  )
}
