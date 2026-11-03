import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { adminApi } from './admin-api.js'
import { useAdminAuth } from './auth.jsx'
import { useAdminData } from './use-admin-data.js'
import { Icon, useToast } from './ui.jsx'

const NAV = [
  { group: 'Overview', items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' }] },
  {
    group: 'Content',
    items: [
      { to: '/admin/projects', label: 'Projects', icon: 'projects' },
      { to: '/admin/services', label: 'Services', icon: 'services' },
      { to: '/admin/testimonials', label: 'Testimonials', icon: 'testimonials' },
    ],
  },
  { group: 'Studio', items: [
    { to: '/admin/inquiries', label: 'Inquiries', icon: 'inquiries', badge: 'new' },
    { to: '/admin/studio', label: 'Settings', icon: 'studio' },
  ] },
]

export default function AdminShell() {
  const { admin, logout } = useAdminAuth()
  const toast = useToast()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // Lightweight NEW-inquiry badge for the nav. The list GET never mutates rows.
  const { data: newCount } = useAdminData(() => adminApi.inquiries({ status: 'NEW', perPage: 1 }), [])

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  const onSignOut = () => {
    logout()
    toast('Signed out of the studio dashboard.')
  }

  const badgeValue = (key) => (key === 'new' ? newCount?.pagination?.total : undefined)

  return (
    <div className="adm-root adm-app">
      <div className={`adm-scrim ${navOpen ? 'is-open' : ''}`} onClick={() => setNavOpen(false)} aria-hidden="true" />

      <aside id="adm-rail" className={`adm-rail ${navOpen ? 'is-open' : ''}`} aria-label="Dashboard navigation">
        <div className="adm-brand">
          <span className="adm-brand__mark">FORMA</span>
          <span className="adm-brand__sub">Content desk</span>
        </div>
        <nav className="adm-nav">
          {NAV.map((section) => (
            <div key={section.group}>
              <p className="adm-nav__group">{section.group}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="adm-nav__link"
                  aria-label={item.label}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {badgeValue(item.badge) > 0 ? <span className="adm-nav__count">{badgeValue(item.badge)}</span> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-rail__foot">
          <a className="adm-nav__link" href="/" target="_blank" rel="noreferrer" style={{ flex: 1 }}>
            <Icon name="external" />
            <span>View live site</span>
          </a>
        </div>
      </aside>

      <div className="adm-col">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-menubtn"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            aria-controls="adm-rail"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name="projects" />
          </button>
          <div>
            <span className="adm-topbar__crumb">FORMA Studio</span>
          </div>
          <div className="adm-topbar__spacer" />
          <div className="adm-right adm-gap" style={{ gap: 12 }}>
            <span style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <b style={{ display: 'block', fontSize: '0.86rem' }}>{admin?.name ?? 'Studio admin'}</b>
              <span className="adm-help" style={{ textTransform: 'capitalize' }}>{admin?.role ?? 'admin'}</span>
            </span>
            <button type="button" className="adm-btn adm-btn--sm" onClick={onSignOut}>Sign out</button>
          </div>
        </header>

        <main className="adm-content adm-content--wide" id="adm-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
