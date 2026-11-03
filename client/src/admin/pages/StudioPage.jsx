import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../admin-api.js'
import { useAdminData, useAdminMutation } from '../use-admin-data.js'
import { AdmError, AdmLoading, Field, useTitle, useToast } from '../ui.jsx'

const FIELDS = ['heroKicker', 'heroTitle', 'heroLead', 'heroImageUrl', 'heroImageAlt', 'street', 'city', 'country', 'email', 'phone', 'hours', 'instagram', 'linkedin', 'foundedYear']

export default function StudioPage() {
  useTitle('Studio settings')
  const toast = useToast()
  const { execute, pending } = useAdminMutation()
  const { data, loading, error, reload } = useAdminData(() => adminApi.studio(), [])
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (data?.studio) setForm(Object.fromEntries(FIELDS.map((key) => [key, data.studio[key] ?? ''])))
  }, [data])

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const save = async (event) => {
    event.preventDefault()
    const payload = { ...form, foundedYear: Number(form.foundedYear), instagram: form.instagram || null, linkedin: form.linkedin || null }
    const result = await execute(() => adminApi.updateStudio(payload))
    if (!result.ok) { setErrors(result.error?.fields ?? {}); toast(result.error?.message ?? 'Could not save studio settings.', 'error'); return }
    toast('Studio settings saved. The public site now uses these details.')
    reload()
  }

  const uploadHero = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    const result = await execute(() => adminApi.uploadStudioImages([file]))
    setUploading(false)
    if (!result.ok) { toast(result.error?.message ?? 'Image upload failed.', 'error'); return }
    setForm((current) => ({ ...current, heroImageUrl: result.data.images[0].url }))
    toast('Hero image uploaded. Save settings to publish it.')
  }

  if (loading) return <AdmLoading message="Loading studio settings…" />
  if (error) return <AdmError error={error} onRetry={reload} />

  return (
    <div className="adm-stack">
      <div><p className="adm-eyebrow">Studio</p><h1 className="adm-h" style={{ fontSize: '1.6rem' }}>Website settings</h1><p className="adm-help">These values feed the homepage hero, footer and contact page directly from the database.</p></div>
      <form className="adm-editor__grid" onSubmit={save} noValidate>
        <div className="adm-stack">
          <section className="adm-panel adm-fieldgroup"><h2 className="adm-fieldgroup__title">Homepage hero</h2>
            <Field label="Kicker" htmlFor="st-kicker" required error={errors.heroKicker}><input id="st-kicker" className="adm-input" value={form.heroKicker ?? ''} onChange={set('heroKicker')} /></Field>
            <Field label="Headline" htmlFor="st-title" required error={errors.heroTitle}><textarea id="st-title" className="adm-textarea" value={form.heroTitle ?? ''} onChange={set('heroTitle')} /></Field>
            <Field label="Introduction" htmlFor="st-lead" required error={errors.heroLead}><textarea id="st-lead" className="adm-textarea" value={form.heroLead ?? ''} onChange={set('heroLead')} /></Field>
            <div className="adm-row2"><Field label="Hero image URL" htmlFor="st-image" required error={errors.heroImageUrl}><input id="st-image" className="adm-input" value={form.heroImageUrl ?? ''} onChange={set('heroImageUrl')} /></Field><Field label="Hero alt text" htmlFor="st-alt" required error={errors.heroImageAlt}><input id="st-alt" className="adm-input" value={form.heroImageAlt ?? ''} onChange={set('heroImageAlt')} /></Field></div>
            <div><input ref={fileRef} className="adm-fileinput" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadHero} aria-label="Upload a new hero image" /><button type="button" className="adm-btn" onClick={() => fileRef.current?.click()} disabled={uploading || pending}>{uploading ? 'Processing image…' : 'Upload new hero image'}</button></div>
          </section>
          <section className="adm-panel adm-fieldgroup"><h2 className="adm-fieldgroup__title">Contact details</h2>
            <Field label="Street address" htmlFor="st-street" required error={errors.street}><input id="st-street" className="adm-input" value={form.street ?? ''} onChange={set('street')} /></Field>
            <div className="adm-row2"><Field label="City / postcode" htmlFor="st-city" required error={errors.city}><input id="st-city" className="adm-input" value={form.city ?? ''} onChange={set('city')} /></Field><Field label="Country" htmlFor="st-country" required error={errors.country}><input id="st-country" className="adm-input" value={form.country ?? ''} onChange={set('country')} /></Field></div>
            <div className="adm-row2"><Field label="Public email" htmlFor="st-email" required error={errors.email}><input id="st-email" className="adm-input" type="email" value={form.email ?? ''} onChange={set('email')} /></Field><Field label="Phone" htmlFor="st-phone" required error={errors.phone}><input id="st-phone" className="adm-input" value={form.phone ?? ''} onChange={set('phone')} /></Field></div>
            <div className="adm-row2"><Field label="Opening hours" htmlFor="st-hours" required error={errors.hours}><input id="st-hours" className="adm-input" value={form.hours ?? ''} onChange={set('hours')} /></Field><Field label="Founded year" htmlFor="st-founded" required error={errors.foundedYear}><input id="st-founded" className="adm-input" type="number" min="1800" max="2100" value={form.foundedYear ?? ''} onChange={set('foundedYear')} /></Field></div>
            <div className="adm-row2"><Field label="Instagram URL" htmlFor="st-instagram" error={errors.instagram}><input id="st-instagram" className="adm-input" type="url" value={form.instagram ?? ''} onChange={set('instagram')} /></Field><Field label="LinkedIn URL" htmlFor="st-linkedin" error={errors.linkedin}><input id="st-linkedin" className="adm-input" type="url" value={form.linkedin ?? ''} onChange={set('linkedin')} /></Field></div>
          </section>
        </div>
        <aside className="adm-sticky"><section className="adm-panel adm-sidecard"><h2 className="adm-fieldgroup__title">Publish settings</h2><p className="adm-help">Saving updates the single StudioProfile record. Reload the public site to see the new values.</p><button className="adm-btn adm-btn--primary" disabled={pending || uploading} style={{ justifyContent: 'center' }}>{pending ? 'Saving…' : 'Save studio settings'}</button></section></aside>
      </form>
      <PasswordPanel />
    </div>
  )
}

function PasswordPanel() {
  const toast = useToast()
  const { execute, pending } = useAdminMutation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')

  const change = async (event) => {
    event.preventDefault()
    setError('')
    if (newPassword.length < 10) { setError('Use at least 10 characters for the new password.'); return }
    const result = await execute(() => adminApi.changePassword(currentPassword, newPassword))
    if (!result.ok) { setError(result.error?.message ?? 'Could not change the password.'); return }
    setCurrentPassword(''); setNewPassword('')
    toast('Password changed. Your current session remains signed in.')
  }

  return (
    <section className="adm-panel" style={{ maxWidth: 720 }}><div className="adm-panel__head"><h2>Account security</h2></div><form className="adm-panel__body adm-form" onSubmit={change}>
      <p className="adm-help">Change the password for the currently signed-in admin. The existing JWT stays valid until it expires or you sign out.</p>
      <div className="adm-row2"><Field label="Current password" htmlFor="pw-current" required><input id="pw-current" className="adm-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></Field><Field label="New password" htmlFor="pw-new" required help="Minimum 10 characters."><input id="pw-new" className="adm-input" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required /></Field></div>
      {error ? <div className="adm-banner adm-banner--error" role="alert">{error}</div> : null}
      <div><button className="adm-btn" disabled={pending}>{pending ? 'Updating…' : 'Change password'}</button></div>
    </form></section>
  )
}
