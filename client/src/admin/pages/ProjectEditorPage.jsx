import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi, reorderImages } from '../admin-api.js'
import { useAdminData, useAdminMutation } from '../use-admin-data.js'
import { CATEGORY_LABELS, PROJECT_STATUSES } from '../../lib/format.js'
import { variants } from '../../lib/images.js'
import { AdmEmpty, AdmError, AdmLoading, Field, Icon, TagInput, useConfirm, useTitle, useToast } from '../ui.jsx'

const EMPTY = {
  slug: '',
  title: '',
  excerpt: '',
  description: '',
  location: '',
  country: 'Portugal',
  year: new Date().getFullYear(),
  areaSqm: '',
  client: '',
  materials: [],
  tags: [],
  category: 'ARCHITECTURE',
  status: 'COMPLETED',
  coverImageUrl: '/img/home/hero.jpg',
  coverImageAlt: '',
  featured: false,
  published: false,
  sortOrder: 0,
}

export default function ProjectEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { execute, pending } = useAdminMutation()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const { data, loading, error, reload } = useAdminData(
    () => (isNew ? Promise.resolve({ project: null }) : adminApi.project(id)),
    [id, isNew],
  )
  const project = data?.project

  useEffect(() => {
    if (project) setForm({ ...EMPTY, ...project, areaSqm: project.areaSqm ?? '', client: project.client ?? '' })
  }, [project])

  useTitle(isNew ? 'New project' : project?.title ?? 'Edit project')

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const save = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      slug: form.slug.trim() || undefined,
      year: Number(form.year),
      areaSqm: form.areaSqm === '' ? null : Number(form.areaSqm),
      client: form.client.trim() || null,
      sortOrder: Number(form.sortOrder),
    }
    const result = await execute(() => (isNew ? adminApi.createProject(payload) : adminApi.updateProject(id, payload)))
    if (!result.ok) {
      setErrors(result.error?.fields ?? {})
      toast(result.error?.message ?? 'The project could not be saved.', 'error')
      return
    }
    toast(isNew ? 'Project created. You can now add gallery images.' : 'Project changes saved.')
    if (isNew) navigate(`/admin/projects/${result.data.project.id}`, { replace: true })
    else reload()
  }

  const upload = async (event) => {
    const files = Array.from(event.target.files ?? []).slice(0, 8)
    event.target.value = ''
    if (!files.length) return
    setUploading(true)
    const result = await execute(() => adminApi.uploadImages(id, files))
    setUploading(false)
    if (result.ok) {
      toast(`${result.data.images.length} image${result.data.images.length === 1 ? '' : 's'} uploaded.`)
      reload()
    } else toast(result.error?.message ?? 'Upload failed.', 'error')
  }

  const move = async (index, direction) => {
    const images = [...project.images]
    const target = index + direction
    if (target < 0 || target >= images.length) return
    ;[images[index], images[target]] = [images[target], images[index]]
    const result = await execute(() => reorderImages(id, images.map((image) => image.id)))
    if (result.ok) reload()
    else toast(result.error?.message ?? 'Could not reorder the gallery.', 'error')
  }

  const setCover = async (imageId) => {
    const result = await execute(() => adminApi.setCover(id, imageId))
    if (result.ok) {
      toast('Cover image updated.')
      reload()
    } else toast(result.error?.message ?? 'Could not set the cover.', 'error')
  }

  const removeImage = async (image) => {
    const ok = await confirm({
      title: 'Remove this gallery image?',
      body: 'The database row and all four generated image files will be deleted.',
      confirmLabel: 'Delete image',
      danger: true,
    })
    if (!ok) return
    const result = await execute(() => adminApi.deleteImage(id, image.id))
    if (result.ok) {
      toast('Image deleted.')
      reload()
    } else toast(result.error?.message ?? 'Could not delete the image.', 'error')
  }

  if (loading) return <AdmLoading message="Loading the project editor…" />
  if (error) return <AdmError error={error} onRetry={reload} />

  return (
    <form className="adm-editor" onSubmit={save} noValidate>
      <div className="adm-gap" style={{ justifyContent: 'space-between' }}>
        <div>
          <Link className="adm-link" to="/admin/projects">← Projects</Link>
          <h1 className="adm-h" style={{ fontSize: '1.7rem', marginTop: 5 }}>{isNew ? 'New project' : project?.title}</h1>
        </div>
        {!isNew && project?.published ? (
          <a className="adm-btn" href={`/projects/${project.slug}`} target="_blank" rel="noreferrer">
            <Icon name="external" /> View live
          </a>
        ) : null}
      </div>

      <div className="adm-editor__grid">
        <div className="adm-stack">
          <section className="adm-panel adm-fieldgroup">
            <h2 className="adm-fieldgroup__title">Project identity</h2>
            <div className="adm-row2">
              <Field label="Title" htmlFor="p-title" required error={errors.title}>
                <input id="p-title" className="adm-input" value={form.title} onChange={set('title')} required />
              </Field>
              <Field label="Slug" htmlFor="p-slug" error={errors.slug} help="Blank generates one from the title.">
                <input id="p-slug" className="adm-input" value={form.slug} onChange={set('slug')} placeholder="casa-example" />
              </Field>
            </div>
            <Field label="Card excerpt" htmlFor="p-excerpt" required error={errors.excerpt}>
              <textarea id="p-excerpt" className="adm-textarea" value={form.excerpt} onChange={set('excerpt')} maxLength={240} required />
            </Field>
            <Field label="Full description" htmlFor="p-description" required error={errors.description}>
              <textarea id="p-description" className="adm-textarea adm-textarea--tall" value={form.description} onChange={set('description')} required />
            </Field>
            <div className="adm-row2">
              <Field label="Location" htmlFor="p-location" required error={errors.location}>
                <input id="p-location" className="adm-input" value={form.location} onChange={set('location')} required />
              </Field>
              <Field label="Country" htmlFor="p-country" required error={errors.country}>
                <input id="p-country" className="adm-input" value={form.country} onChange={set('country')} required />
              </Field>
            </div>
            <div className="adm-row3">
              <Field label="Year" htmlFor="p-year" required error={errors.year}>
                <input id="p-year" className="adm-input" type="number" min="1850" max="2100" value={form.year} onChange={set('year')} required />
              </Field>
              <Field label="Area (m²)" htmlFor="p-area" error={errors.areaSqm}>
                <input id="p-area" className="adm-input" type="number" min="1" value={form.areaSqm} onChange={set('areaSqm')} />
              </Field>
              <Field label="Client" htmlFor="p-client" error={errors.client}>
                <input id="p-client" className="adm-input" value={form.client} onChange={set('client')} />
              </Field>
            </div>
          </section>

          <section className="adm-panel adm-fieldgroup">
            <h2 className="adm-fieldgroup__title">Classification</h2>
            <div className="adm-row2">
              <Field label="Category" htmlFor="p-category" required error={errors.category}>
                <select id="p-category" className="adm-select" value={form.category} onChange={set('category')}>
                  {Object.entries(CATEGORY_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                </select>
              </Field>
              <Field label="Build status" htmlFor="p-status" required error={errors.status}>
                <select id="p-status" className="adm-select" value={form.status} onChange={set('status')}>
                  {Object.entries(PROJECT_STATUSES).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Materials" htmlFor="p-materials" hint="Press Enter after each material." error={errors.materials}>
              <TagInput id="p-materials" value={form.materials} onChange={(value) => setForm((current) => ({ ...current, materials: value }))} />
            </Field>
            <Field label="Search tags" htmlFor="p-tags" hint="Lowercase tags also power public project search." error={errors.tags}>
              <TagInput id="p-tags" value={form.tags} onChange={(value) => setForm((current) => ({ ...current, tags: value }))} />
            </Field>
          </section>

          {!isNew ? (
            <section className="adm-panel adm-fieldgroup">
              <div className="adm-gap" style={{ justifyContent: 'space-between' }}>
                <h2 className="adm-fieldgroup__title">Gallery · {project?.images?.length ?? 0} images</h2>
                <button type="button" className="adm-btn" onClick={() => fileRef.current?.click()} disabled={uploading || pending}>
                  <Icon name="image" /> {uploading ? 'Processing…' : 'Upload images'}
                </button>
                <input ref={fileRef} className="adm-fileinput" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} aria-label="Upload gallery images" />
              </div>
              <p className="adm-help">JPEG, PNG or WebP · up to 8 at once · 12 MB each. Every upload is re-encoded to four responsive files.</p>
              {project?.images?.length ? (
                <div className="adm-imglist">
                  {project.images.map((image, index) => (
                    <ImageRow
                      key={image.id}
                      image={image}
                      index={index}
                      count={project.images.length}
                      isCover={project.coverImageUrl === image.url}
                      disabled={pending}
                      onMove={move}
                      onCover={setCover}
                      onDelete={removeImage}
                      onSaved={reload}
                      projectId={id}
                    />
                  ))}
                </div>
              ) : <AdmEmpty title="No gallery images yet" body="Upload at least one photograph, then promote it to the cover." />}
            </section>
          ) : (
            <section className="adm-panel adm-fieldgroup">
              <h2 className="adm-fieldgroup__title">Gallery</h2>
              <p className="adm-help">Save the project first. The gallery uploader appears here immediately afterwards.</p>
            </section>
          )}
        </div>

        <aside className="adm-sticky">
          <section className="adm-panel adm-sidecard">
            <h2 className="adm-fieldgroup__title">Publishing</h2>
            <label className="adm-check"><input type="checkbox" checked={form.published} onChange={set('published')} /> Visible on the public site</label>
            <label className="adm-check"><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Feature on the homepage</label>
            <Field label="Manual sort order" htmlFor="p-sort" error={errors.sortOrder}>
              <input id="p-sort" className="adm-input" type="number" min="0" max="9999" value={form.sortOrder} onChange={set('sortOrder')} />
            </Field>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={pending || uploading} style={{ justifyContent: 'center' }}>
              {pending ? 'Saving…' : isNew ? 'Create project' : 'Save changes'}
            </button>
            <Link className="adm-btn" to="/admin/projects" style={{ justifyContent: 'center' }}>Back to projects</Link>
          </section>

          <section className="adm-panel adm-sidecard">
            <h2 className="adm-fieldgroup__title">Card cover</h2>
            <img src={variants(form.coverImageUrl).smallJpg} alt="" style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover' }} />
            <Field label="Cover image URL" htmlFor="p-cover" required error={errors.coverImageUrl}>
              <input id="p-cover" className="adm-input" value={form.coverImageUrl} onChange={set('coverImageUrl')} required />
            </Field>
            <Field label="Cover alt text" htmlFor="p-cover-alt" required error={errors.coverImageAlt}>
              <textarea id="p-cover-alt" className="adm-textarea" value={form.coverImageAlt} onChange={set('coverImageAlt')} required />
            </Field>
          </section>
        </aside>
      </div>
    </form>
  )
}

function ImageRow({ projectId, image, index, count, isCover, disabled, onMove, onCover, onDelete, onSaved }) {
  const toast = useToast()
  const { execute } = useAdminMutation()
  const [alt, setAlt] = useState(image.alt ?? '')
  const [caption, setCaption] = useState(image.caption ?? '')
  const [saving, setSaving] = useState(false)

  const saveMeta = async () => {
    setSaving(true)
    const result = await execute(() => adminApi.updateImage(projectId, image.id, { alt, caption: caption || null }))
    setSaving(false)
    if (result.ok) {
      toast('Image details saved.')
      onSaved()
    } else toast(result.error?.message ?? 'Could not save image details.', 'error')
  }

  return (
    <div className="adm-imgrow" data-cover={isCover}>
      <div className="adm-imgrow__move">
        <span className="adm-imgrow__order">{String(index + 1).padStart(2, '0')}</span>
        <button type="button" className="adm-movebtn" disabled={disabled || index === 0} onClick={() => onMove(index, -1)} aria-label={`Move image ${index + 1} up`}><Icon name="up" /></button>
        <button type="button" className="adm-movebtn" disabled={disabled || index === count - 1} onClick={() => onMove(index, 1)} aria-label={`Move image ${index + 1} down`}><Icon name="down" /></button>
      </div>
      <img className="adm-thumb adm-thumb--lg" src={variants(image.url).smallJpg} alt="" />
      <div className="adm-imgrow__meta">
        {isCover ? <span className="adm-pill adm-pill--featured">Cover</span> : null}
        <label className="adm-visuallyhidden" htmlFor={`alt-${image.id}`}>Image alt text</label>
        <input id={`alt-${image.id}`} className="adm-input" value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Describe the image" />
        <label className="adm-visuallyhidden" htmlFor={`caption-${image.id}`}>Image caption</label>
        <input id={`caption-${image.id}`} className="adm-input" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Optional caption" />
      </div>
      <div className="adm-imgrow__actions">
        <button type="button" className="adm-btn adm-btn--sm" onClick={saveMeta} disabled={disabled || saving}>{saving ? 'Saving…' : 'Save text'}</button>
        <button type="button" className="adm-btn adm-btn--sm" onClick={() => onCover(image.id)} disabled={disabled || isCover}>Use as cover</button>
        <button type="button" className="adm-btn adm-btn--sm adm-btn--danger" onClick={() => onDelete(image)} disabled={disabled}>Delete</button>
      </div>
    </div>
  )
}
