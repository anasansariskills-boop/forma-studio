import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'

/* ======================================================== icons (inline) */
const PATHS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z',
  projects: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 4 4',
  services: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 4 9-4',
  testimonials: 'M7 7h4v4H7zM13 7h4v4h-4zM7 13c0 2 1 3 3 3M13 13c0 2 1 3 3 3',
  inquiries: 'M3 6h18v12H3zM3 7l9 6 9-6',
  studio: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  close: 'M6 6l12 12M18 6L6 18',
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M5 12l7 7 7-7',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  check: 'M4 12l5 5L20 6',
  image: 'M3 5h18v14H3zM8 11l3 3 3-4 4 5M3 5l18 14',
}

export function Icon({ name, size = 16, ...rest }) {
  return (
    <svg className="adm-nav__ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d={PATHS[name] ?? ''} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ============================================================= document title */
export function useTitle(text) {
  useEffect(() => {
    const previous = document.title
    document.title = text ? `${text} · FORMA admin` : 'FORMA Studio — admin'
    return () => {
      document.title = previous
    }
  }, [text])
}

/* ================================================================== toasts */
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), [])
  const push = useCallback((message, kind = 'ok') => {
    const id = (idRef.current += 1)
    setItems((list) => [...list.slice(-3), { id, message, kind }])
    setTimeout(() => remove(id), kind === 'error' ? 7000 : 4800)
  }, [remove])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`adm-toast adm-toast--${t.kind}`}>
            <span>{t.message}</span>
            <button type="button" onClick={() => remove(t.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx.push
}

/* ================================================================== confirm */
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolverRef = useRef(null)

  const settle = useCallback((result) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setRequest(null)
  }, [])

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolverRef.current = resolve
        setRequest({ cancelLabel: 'Cancel', confirmLabel: 'Confirm', ...options })
      }),
    [],
  )

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request ? <ConfirmDialog request={request} onResolve={settle} /> : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx.confirm
}

function ConfirmDialog({ request, onResolve }) {
  const cardRef = useRef(null)
  const confirmRef = useRef(null)
  const restoreRef = useRef(document.activeElement)

  useEffect(() => {
    confirmRef.current?.focus()
    restoreRef.current?.focus?.()
    return () => restoreRef.current?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onResolve(false)
      } else if (event.key === 'Tab') {
        const nodes = cardRef.current?.querySelectorAll('button, [href], input, select, textarea')
        if (!nodes || nodes.length === 0) return
        const list = Array.from(nodes).filter((n) => !n.disabled)
        const first = list[0]
        const last = list[list.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onResolve])

  return (
    <div className="adm-modal" role="alertdialog" aria-modal="true" aria-labelledby="adm-confirm-title" aria-describedby="adm-confirm-body">
      <div className="adm-modal__scrim" onClick={() => onResolve(false)} />
      <div className="adm-modal__card" ref={cardRef}>
        <h2 className="adm-modal__title" id="adm-confirm-title">{request.title}</h2>
        <div className="adm-modal__body" id="adm-confirm-body">
          {request.body ? <p>{request.body}</p> : null}
          {request.detail ? (
            <p className="adm-muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>{request.detail}</p>
          ) : null}
        </div>
        <div className="adm-modal__foot">
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onResolve(false)}>
            {request.cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`adm-btn ${request.danger ? 'adm-btn--danger' : 'adm-btn--primary'}`}
            onClick={() => onResolve(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== generic modal */
export function Modal({ title, onClose, children, wide = false, footer }) {
  const cardRef = useRef(null)
  const restoreRef = useRef(document.activeElement)
  const titleId = useId()

  useEffect(() => {
    const first = cardRef.current?.querySelector('input, select, textarea, button')
    first?.focus?.()
    restoreRef.current?.focus?.()
    return () => restoreRef.current?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'Tab') {
        const list = Array.from(cardRef.current?.querySelectorAll('input, select, textarea, button, [href]') ?? []).filter((n) => !n.disabled)
        if (!list.length) return
        const first = list[0]
        const last = list[list.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="adm-modal__scrim" onClick={onClose} />
      <div className={`adm-modal__card ${wide ? 'adm-modal__card--wide' : ''}`} ref={cardRef}>
        <div className="adm-panel__head" style={{ padding: 0, borderBottom: '1px solid var(--line)' }}>
          <h2 className="adm-modal__title" id={titleId} style={{ fontSize: '1.2rem' }}>{title}</h2>
          <button type="button" className="adm-btn adm-btn--ghost adm-btn--icon adm-right" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div className="adm-modal__scroll">{children}</div>
        {footer ? <div className="adm-modal__foot">{footer}</div> : null}
      </div>
    </div>
  )
}

/* ================================================================== fields */
export function Field({ label, htmlFor, required, help, error, children, hint }) {
  return (
    <div className="adm-field">
      <label className="adm-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="req"> *</span> : null}
      </label>
      {children}
      {help ? <span className="adm-help">{help}</span> : null}
      {hint ? <span className="adm-help">{hint}</span> : null}
      <span className="adm-err" aria-live="polite">{error ?? ''}</span>
    </div>
  )
}

/* ================================================================== tag input */
export function TagInput({ id, value = [], onChange, placeholder = 'Type and press Enter', max = 20, disabled }) {
  const [draft, setDraft] = useState('')

  const commit = (raw) => {
    const tokens = raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (tokens.length === 0) return
    const next = [...value]
    for (const token of tokens) {
      if (next.length >= max) break
      if (!next.includes(token)) next.push(token.slice(0, 60))
    }
    onChange(next)
    setDraft('')
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(draft)
    } else if (event.key === 'Backspace' && draft === '' && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="adm-tags">
      {value.map((tag, index) => (
        <span className="adm-tag" key={`${tag}-${index}`}>
          {tag}
          <button type="button" disabled={disabled} onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label={`Remove ${tag}`}>
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled || value.length >= max}
        placeholder={value.length >= max ? `Limit ${max}` : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && commit(draft)}
        aria-describedby={`${id}-help`}
      />
    </div>
  )
}

/* ================================================================== pagination */
export function Pagination({ pagination, onPage }) {
  if (!pagination) return null
  const { page, perPage, total, pages } = pagination
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)

  return (
    <div className="adm-pager">
      <span role="status" aria-live="polite">
        Showing <b className="adm-tabnum">{from}–{to}</b> of <b className="adm-tabnum">{total}</b>
      </span>
      <div className="adm-pager__btns">
        <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span style={{ alignSelf: 'center' }}>Page {page} / {Math.max(pages, 1)}</span>
        <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

/* ================================================================== charts */
/** Vertical bars from a [{label, value}] series. Inline only, no dependency. */
export function SeriesBars({ data = [], dense = false }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <>
      <div className={`adm-bars ${dense ? 'adm-bars--days' : ''}`} role="img" aria-label={`Inquiries over time, peak ${max}`}>
        {data.map((d, i) => (
          <div className="adm-bar" key={d.label + i} title={`${d.label}: ${d.value}`}>
            <div className="adm-bar__fill" style={{ height: `${Math.round((d.value / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      {!dense ? (
        <div className="adm-bars__labels" aria-hidden="true">
          {data.map((d, i) => (
            <span key={d.label + i}>{String(d.label).slice(-2)}</span>
          ))}
        </div>
      ) : (
        <div className="adm-gap" style={{ justifyContent: 'space-between', marginTop: 6 }} aria-hidden="true">
          <span className="adm-help">{data[0]?.label?.slice(5)}</span>
          <span className="adm-help">{data[data.length - 1]?.label?.slice(5)}</span>
        </div>
      )}
      <ul className="adm-visuallyhidden">
        {data.map((d, i) => (
          <li key={d.label + i}>{d.label}: {d.value} inquiries</li>
        ))}
      </ul>
    </>
  )
}

/** Horizontal share bars: [{label, count}] -> 0..max tracks. */
export function DistBars({ rows = [], emptyLabel = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (rows.length === 0) return <p className="adm-help">{emptyLabel}</p>
  return (
    <div className="adm-dist">
      {rows.map((r) => (
        <div className="adm-dist__row" key={r.label}>
          <span className="adm-dist__label">{r.label}</span>
          <span className="adm-dist__track"><span className="adm-dist__bar" style={{ width: `${(r.count / max) * 100}%` }} /></span>
          <span className="adm-dist__n">{r.count}</span>
        </div>
      ))}
    </div>
  )
}

/* ================================================================== states */
export function AdmLoading({ message = 'Loading…' }) {
  return (
    <div className="adm-state" role="status" aria-live="polite">
      <div className="adm-spinner" aria-hidden="true" />
      <div>{message}</div>
    </div>
  )
}

export function AdmError({ error, onRetry }) {
  return (
    <div className="adm-state adm-state--error" role="alert">
      <div className="adm-state__title">{error?.message ?? 'Could not load this.'}</div>
      <p style={{ marginBottom: 12 }}>
        {error?.status === 0
          ? 'The studio server is not responding.'
          : error?.status === 404
            ? 'That record no longer exists.'
            : 'The request was rejected. Try again — if it persists, check the console.'}
      </p>
      {onRetry ? (
        <button type="button" className="adm-btn" onClick={onRetry}>Retry</button>
      ) : null}
    </div>
  )
}

export function AdmEmpty({ title = 'Nothing here yet', body, action }) {
  return (
    <div className="adm-state" role="status" aria-live="polite">
      <div className="adm-state__title">{title}</div>
      {body ? <p>{body}</p> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  )
}
