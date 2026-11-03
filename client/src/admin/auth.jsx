import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from './admin-api.js'

const AdminAuthContext = createContext(null)

/**
 * Owns the whole admin session. The JWT lives ONLY in sessionStorage via
 * adminApi.setToken (never localStorage); signing out is stateless and just
 * discards it. `forcedLogout` is the bounce path for any 401 (expired or
 * forged token) raised by a page-level request.
 */
export function AdminAuthProvider({ children }) {
  const [status, setStatus] = useState('checking') // checking | anonymous | authenticated
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    let alive = true
    const token = adminApi.token()
    if (!token) {
      setStatus('anonymous')
      return undefined
    }
    adminApi
      .session()
      .then((payload) => {
        if (!alive) return
        setAdmin(payload?.admin ?? null)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!alive) return
        adminApi.clearToken()
        setAdmin(null)
        setStatus('anonymous')
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const payload = await adminApi.login(email, password)
      adminApi.setToken(payload.token)
      setAdmin(payload.admin ?? null)
      setStatus('authenticated')
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    }
  }, [])

  const logout = useCallback(() => {
    adminApi.clearToken()
    setAdmin(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(() => ({ status, admin, login, logout, forcedLogout: logout }), [status, admin, login, logout])
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>')
  return ctx
}

/** The sign-in screen. Talks to the real backend and surfaces server errors. */
export default function LoginPage() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const emailRef = useRef(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (pending) return
    setError(null)
    if (!email.trim() || !password) {
      setError({ message: 'Enter both your email and password to continue.' })
      return
    }
    setPending(true)
    const result = await login(email.trim(), password)
    setPending(false)
    if (result.ok) {
      navigate('/admin/dashboard', { replace: true })
    } else {
      const err = result.error
      // 429 from the auth rate limiter, or 401 "email and password do not match".
      setError(err)
      setPassword('')
    }
  }

  const errorText = error
    ? error.status === 429
      ? 'Too many sign-in attempts. Please wait a few minutes before trying again.'
      : error.message ?? 'Sign-in failed. Please try again.'
    : ''

  return (
    <div className="adm-login">
      <aside className="adm-login__aside" aria-hidden="true">
        <div>
          <span className="adm-brand__mark" style={{ color: 'var(--paper)' }}>FORMA</span>
          <span className="adm-brand__sub">Studio · Lisbon</span>
        </div>
        <div>
          <p className="display" style={{ fontSize: 'clamp(2.2rem,4vw,3.4rem)', color: 'var(--paper)' }}>
            Content<br />desk
          </p>
          <p className="label label--invert" style={{ marginTop: 12 }}>Internal · authorised staff only</p>
        </div>
      </aside>

      <div className="adm-login__formwrap">
        <form className="adm-login__card" onSubmit={onSubmit} noValidate>
          <div>
            <p className="adm-eyebrow">Sign in</p>
            <h1>Studio dashboard</h1>
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="adm-email">Email address</label>
            <input
              id="adm-email"
              ref={emailRef}
              className="adm-input"
              type="email"
              autoComplete="username"
              spellCheck="false"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="adm-field">
            <label className="adm-label" htmlFor="adm-password">Password</label>
            <input
              id="adm-password"
              className="adm-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>

          <div aria-live="assertive" role="alert">
            {error ? <div className="adm-banner adm-banner--error">{errorText}</div> : null}
          </div>

          <button type="submit" className="adm-btn adm-btn--primary" disabled={pending} style={{ justifyContent: 'center' }}>
            {pending ? <span className="adm-btn__spin" aria-hidden="true" /> : null}
            {pending ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="adm-help">Access to this area is logged. Forgotten your password? Contact the studio lead.</p>
        </form>
      </div>
    </div>
  )
}
