import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useBodyLock, useScrolled } from '../lib/hooks.js'
import { useSite } from '../lib/site-context.js'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/projects', label: 'Projects' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const scrolled = useScrolled(40)
  const { studio } = useSite()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useBodyLock(open)

  // Transparent over the home hero only; solid everywhere else and once scrolled.
  const isHome = location.pathname === '/'
  const solid = !isHome || scrolled || open

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className={`hdr ${solid ? 'is-solid' : ''}`}>
        <NavLink to="/" className="brand" aria-label="FORMA Studio, home">
          FORMA<em>Studio</em>
        </NavLink>

        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hdr-cta">
          <NavLink to="/contact" className="btn">
            Enquire
          </NavLink>
          <button
            type="button"
            className="burger"
            aria-expanded={open}
            aria-controls="site-drawer"
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </header>

      <div id="site-drawer" className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav className="drawer-nav" aria-label="Mobile">
          {NAV.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              tabIndex={open ? 0 : -1}
              className="drawer-link"
            >
              <i>{String(index + 1).padStart(2, '0')}</i>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="drawer-foot">
          <span>
            {studio?.street ?? 'Rua do Príncipe 24'}, {studio?.city ?? 'Lisbon'}
          </span>
          <a tabIndex={open ? 0 : -1} href={`mailto:${studio?.email ?? 'studio@forma-studio.com'}`}>
            {studio?.email ?? 'studio@forma-studio.com'}
          </a>
        </div>
      </div>
    </>
  )
}
