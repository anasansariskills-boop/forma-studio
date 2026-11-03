import { useEffect, useRef, useState } from 'react'
import { publicApi, ApiError } from '../lib/api.js'
import { PROJECT_TYPES, BUDGET_LABELS, TIMELINE_LABELS } from '../lib/format.js'

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  projectType: '',
  budget: '',
  timeline: '',
  location: '',
  message: '',
  company: '',
}

const RULES = {
  name: (v) => (v.trim().length < 2 ? 'Tell us who you are.' : ''),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'A working email address, please.'),
  projectType: (v) => (v ? '' : 'Choose the closest type of project.'),
  message: (v) => (v.trim().length < 20 ? `A little more detail helps — ${Math.max(0, 20 - v.trim().length)} characters to go.` : ''),
}

const touchedErrors = (values) =>
  Object.fromEntries(
    Object.entries(RULES)
      .map(([field, rule]) => [field, rule(values[field] ?? '')])
      .filter(([, message]) => message),
  )

/**
 * The single intake form for the whole site. Mirrors the server's zod rules so
 * feedback is instant, then defers to the API for the authoritative errors and
 * maps them back onto fields. `source` is sent as a header for attribution.
 */
export default function InquiryForm({ source = 'website', defaultProjectType, compact = false, onSuccess }) {
  const [values, setValues] = useState({ ...EMPTY, ...(defaultProjectType ? { projectType: defaultProjectType } : {}) })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | failed
  const [notice, setNotice] = useState('')
  const [attempts, setAttempts] = useState(0)
  const firstField = useRef(null)

  useEffect(() => {
    if (status === 'sent') setValues({ ...EMPTY })
  }, [status])

  const set = (field) => (event) => {
    const value = event.target.value
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return

    const invalid = touchedErrors(values)
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid)
      setStatus('failed')
      setNotice('Please check the highlighted fields.')
      return
    }

    setStatus('sending')
    setNotice('')
    setErrors({})

    // Empty optionals are omitted rather than sent as '' — the server treats
    // '' and a missing key differently for phone/location.
    const payload = { ...values }
    if (!payload.company) delete payload.company
    for (const key of ['phone', 'budget', 'timeline', 'location']) {
      if (!payload[key]) delete payload[key]
    }

    try {
      const result = await publicApi.inquire(payload, source)
      setStatus('sent')
      setNotice(result?.message ?? 'Thank you — your enquiry is with the studio.')
      setAttempts(0)
      onSuccess?.(result)
    } catch (error) {
      setStatus('failed')
      if (error instanceof ApiError && error.status === 429) {
        setNotice('Too many attempts from this connection. Please wait a minute and try again.')
      } else if (error instanceof ApiError && error.status === 400 && Object.keys(error.fields).length > 0) {
        setErrors(error.fields)
        setNotice('Some details need another look.')
      } else if (error instanceof ApiError && error.status === 0) {
        setAttempts((value) => value + 1)
        setNotice('We could not reach the studio server. Your message has not been sent.')
      } else {
        setNotice(error.message ?? 'Something went wrong. Please try again.')
      }
    }
  }

  if (status === 'sent') {
    return (
      <div className="form-status" role="status" aria-live="polite">
        <p className="label label--ink">Enquiry received</p>
        <p className="lead" style={{ fontSize: '1.15rem' }}>{notice}</p>
        <p className="field-hint">
          Two working days is our usual reply time. If it is urgent, call the studio directly.
        </p>
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setStatus('idle')
              setNotice('')
              requestAnimationFrame(() => firstField.current?.focus())
            }}
          >
            Send another
          </button>
        </div>
      </div>
    )
  }

  const errorId = (field) => `${field}-error`
  const describedBy = (field, hint) =>
    [errors[field] ? errorId(field) : null, hint ? `${field}-hint` : null].filter(Boolean).join(' ') || undefined

  return (
    <form className="form-grid" onSubmit={submit} noValidate aria-describedby="form-live">
      {notice && (
        <div className={`form-status ${status === 'failed' ? 'form-status--error' : ''}`} role="alert">
          <p>{notice}</p>
          {status === 'failed' && attempts > 1 && (
            <p className="field-hint">
              Still failing? Write to studio@forma-studio.com and we will pick it up manually.
            </p>
          )}
        </div>
      )}

      <div className={`field ${errors.name ? 'has-error' : ''}`}>
        <label htmlFor="name">Your name *</label>
        <input
          id="name"
          ref={firstField}
          name="name"
          value={values.name}
          onChange={set('name')}
          autoComplete="name"
          required
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy('name')}
        />
        {errors.name && <p className="field-error" id={errorId('name')}>{errors.name}</p>}
      </div>

      <div className={`field ${errors.email ? 'has-error' : ''}`}>
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          name="email"
          type="email"
          value={values.email}
          onChange={set('email')}
          autoComplete="email"
          required
          maxLength={160}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy('email')}
        />
        {errors.email && <p className="field-error" id={errorId('email')}>{errors.email}</p>}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={set('phone')}
          autoComplete="tel"
          maxLength={40}
          aria-describedby={describedBy(null, 'phone')}
        />
        <p className="field-hint" id="phone-hint">Optional — include the country code if you are outside Portugal.</p>
      </div>

      <div className="field">
        <label htmlFor="location">Location</label>
        <input
          id="location"
          name="location"
          value={values.location}
          onChange={set('location')}
          autoComplete="address-level2"
          maxLength={90}
        />
      </div>

      <div className={`field field-full ${errors.projectType ? 'has-error' : ''}`}>
        <span className="field-label" id="projectType-label">Type of project *</span>
        <div className="choice-grid" role="radiogroup" aria-labelledby="projectType-label" aria-invalid={Boolean(errors.projectType)}>
          {Object.entries(PROJECT_TYPES).map(([value, text]) => (
            <label key={value} className={`choice ${values.projectType === value ? 'is-picked' : ''}`}>
              <input
                type="radio"
                name="projectType"
                value={value}
                checked={values.projectType === value}
                onChange={set('projectType')}
              />
              {text}
            </label>
          ))}
        </div>
        {errors.projectType && <p className="field-error" id={errorId('projectType')}>{errors.projectType}</p>}
      </div>

      <div className="field">
        <label htmlFor="budget">Budget range</label>
        <select id="budget" name="budget" value={values.budget} onChange={set('budget')}>
          <option value="">Not sure yet</option>
          {Object.entries(BUDGET_LABELS)
            .filter(([key]) => key !== 'undefined')
            .map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          <option value="undefined">Prefer not to say</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="timeline">Start</label>
        <select id="timeline" name="timeline" value={values.timeline} onChange={set('timeline')}>
          <option value="">No fixed date</option>
          {Object.entries(TIMELINE_LABELS).map(([value, text]) => (
            <option key={value} value={value}>{text}</option>
          ))}
        </select>
      </div>

      <div className={`field field-full ${errors.message ? 'has-error' : ''}`}>
        <label htmlFor="message">The project *</label>
        <textarea
          id="message"
          name="message"
          value={values.message}
          onChange={set('message')}
          required
          minLength={20}
          maxLength={4000}
          rows={compact ? 5 : 7}
          placeholder="Site, size, what already exists, what you want to change — anything you would say in the first phone call."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy('message', 'message')}
        />
        <p className="field-hint" id="message-hint">
          {errors.message ? <span className="field-error">{errors.message}</span> : `${values.message.trim().length} characters — 20 minimum.`}
        </p>
      </div>

      {/* Honeypot: humans never see or reach this, bots fill it, the server drops those. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company">Company (leave blank)</label>
        <input
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={values.company}
          onChange={set('company')}
        />
      </div>

      <div className="field-full">
        <button type="submit" className="btn btn--clay" disabled={status === 'sending'}>
          {status === 'sending' ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden="true" />
              Sending
            </>
          ) : (
            'Send enquiry'
          )}
        </button>
      </div>

      <p className="field-hint field-full" id="form-live" aria-live="polite">
        We reply to every enquiry within two working days. Your details stay with the studio.
      </p>
    </form>
  )
}
