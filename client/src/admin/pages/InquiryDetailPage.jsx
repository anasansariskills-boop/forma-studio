import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../admin-api.js'
import { useAdminData, useAdminMutation } from '../use-admin-data.js'
import { BUDGET_LABELS, INQUIRY_STATUS_LABELS, PROJECT_TYPES, TIMELINE_LABELS, formatDateTime, label } from '../../lib/format.js'
import { AdmError, AdmLoading, Field, Icon, useConfirm, useTitle, useToast } from '../ui.jsx'

export default function InquiryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { execute, pending } = useAdminMutation()
  const { data, loading, error, reload } = useAdminData(() => adminApi.inquiry(id), [id])
  const [status, setStatus] = useState('NEW')
  const [note, setNote] = useState('')
  const inquiry = data?.inquiry

  useTitle(inquiry ? `Inquiry from ${inquiry.name}` : 'Inquiry')
  useEffect(() => {
    if (inquiry) { setStatus(inquiry.status); setNote(inquiry.adminNote ?? '') }
  }, [inquiry])

  const save = async (event) => {
    event.preventDefault()
    const result = await execute(() => adminApi.updateInquiry(id, { status, adminNote: note.trim() || null }))
    if (result.ok) { toast('Inquiry updated.'); reload() }
    else toast(result.error?.message ?? 'Could not update the inquiry.', 'error')
  }

  const remove = async () => {
    const ok = await confirm({ title: 'Delete this inquiry?', body: `Permanently remove the message from ${inquiry.name}.`, confirmLabel: 'Delete inquiry', danger: true })
    if (!ok) return
    const result = await execute(() => adminApi.deleteInquiry(id))
    if (result.ok) { toast('Inquiry deleted.'); navigate('/admin/inquiries') }
    else toast(result.error?.message ?? 'Could not delete the inquiry.', 'error')
  }

  if (loading) return <AdmLoading message="Opening the inquiry…" />
  if (error) return <AdmError error={error} onRetry={reload} />
  if (!inquiry) return null

  const facts = [
    ['Email', inquiry.email], ['Phone', inquiry.phone || '—'], ['Project type', label(PROJECT_TYPES, inquiry.projectType)],
    ['Budget', inquiry.budget ? label(BUDGET_LABELS, inquiry.budget) : '—'], ['Start', inquiry.timeline ? label(TIMELINE_LABELS, inquiry.timeline) : '—'],
    ['Location', inquiry.location || '—'], ['Source', inquiry.source || 'website'], ['Received', formatDateTime(inquiry.createdAt)],
  ]

  return (
    <div className="adm-stack">
      <div className="adm-gap" style={{ justifyContent: 'space-between' }}><div><Link className="adm-link" to="/admin/inquiries">← Inquiries</Link><h1 className="adm-h" style={{ fontSize: '1.7rem', marginTop: 5 }}>{inquiry.name}</h1></div><a className="adm-btn adm-btn--primary" href={`mailto:${inquiry.email}?subject=${encodeURIComponent('Your FORMA Studio project enquiry')}`}><Icon name="external" /> Reply by email</a></div>
      <div className="adm-editor__grid">
        <div className="adm-stack">
          <section className="adm-panel"><div className="adm-panel__head"><h2>The project brief</h2><span className={`adm-pill adm-pill--${inquiry.status.toLowerCase()}`}>{label(INQUIRY_STATUS_LABELS, inquiry.status)}</span></div><div className="adm-panel__body"><p className="adm-msg">{inquiry.message}</p></div></section>
          <section className="adm-panel"><div className="adm-panel__head"><h2>Contact & project details</h2></div><div className="adm-panel__body"><dl className="adm-meta">{facts.map(([key, value]) => <div key={key} style={{ display: 'contents' }}><dt className="adm-meta__k">{key}</dt><dd className="adm-meta__v" style={{ margin: 0 }}>{key === 'Email' ? <a className="adm-link" href={`mailto:${value}`}>{value}</a> : value}</dd></div>)}</dl></div></section>
        </div>
        <aside className="adm-sticky">
          <form className="adm-panel adm-sidecard" onSubmit={save}>
            <h2 className="adm-fieldgroup__title">Pipeline</h2>
            <Field label="Status" htmlFor="i-status"><select id="i-status" className="adm-select" value={status} onChange={(event) => setStatus(event.target.value)}>{Object.entries(INQUIRY_STATUS_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Field>
            <Field label="Private studio note" htmlFor="i-note" help="Never shown on the public website."><textarea id="i-note" className="adm-textarea" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Call outcome, next action, assigned partner…" /></Field>
            <button className="adm-btn adm-btn--primary" disabled={pending} style={{ justifyContent: 'center' }}>{pending ? 'Saving…' : 'Save update'}</button>
            <button type="button" className="adm-btn adm-btn--danger" onClick={remove} disabled={pending} style={{ justifyContent: 'center' }}>Delete inquiry</button>
          </form>
        </aside>
      </div>
    </div>
  )
}
