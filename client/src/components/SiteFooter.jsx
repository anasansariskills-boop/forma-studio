import { Link } from 'react-router-dom'
import { useSite } from '../lib/site-context.js'
import { pluralize } from '../lib/format.js'

export default function SiteFooter() {
  const { studio, portfolio } = useSite()
  const year = new Date().getFullYear()
  const email = studio?.email ?? 'studio@forma-studio.com'

  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-grid">
          <div>
            <h4>Studio</h4>
            <address>
              <p>{studio?.street ?? 'Rua do Príncipe 24'}</p>
              <p>
                {studio?.city ?? 'Lisbon'}
                {studio?.country ? `, ${studio.country}` : ''}
              </p>
              <p>{studio?.hours ?? 'Mon–Thu 09:30–18:00 · Fri by appointment'}</p>
            </address>
          </div>

          <div>
            <h4>Pages</h4>
            <ul>
              <li><Link to="/projects">Projects</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/admin">Studio login</Link></li>
            </ul>
          </div>

          <div>
            <h4>Practice</h4>
            <p>{portfolio ? pluralize(portfolio.total, 'published project') : 'Selected work'}</p>
            <p>Founded {studio?.foundedYear ?? 2011}</p>
            <p>Architecture &amp; interiors, Portugal</p>
          </div>

          <div>
            <h4>Direct</h4>
            <p><a href={`mailto:${email}`}>{email}</a></p>
            {studio?.phone && <p><a href={`tel:${String(studio.phone).replace(/\s/g, '')}`}>{studio.phone}</a></p>}
            <p>
              <Link to="/contact">Start an enquiry →</Link>
            </p>
          </div>
        </div>

        <p className="ftr-mark" aria-hidden="true">FORMA</p>

        <div className="ftr-legal">
          <span>© {year} FORMA Studio</span>
          <span>A fictional practice, built as a portfolio demonstration.</span>
          <span>Photography under the Unsplash License.</span>
        </div>
      </div>
    </footer>
  )
}
