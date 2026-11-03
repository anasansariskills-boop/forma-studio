import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Reveal from '../components/Reveal.jsx'
import ArrowLink from '../components/ArrowLink.jsx'
import { EmptyState, ErrorState, Loading, SkeletonRows } from '../components/StateBlock.jsx'
import { publicApi } from '../lib/api.js'
import { useApi, useSeo } from '../lib/hooks.js'
import { pluralize } from '../lib/format.js'
import '../styles/services.css'

const pad = (n) => String(n).padStart(2, '0')

/** The API stores the long text with blank lines between paragraphs. */
const paragraphsOf = (text) =>
  (text ?? '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

export default function Services() {
  const { data, loading, error, reload } = useApi(() => publicApi.services(), [])
  const services = data?.services ?? []

  useSeo({
    title: 'Services',
    description:
      'Architecture, interior design, commercial design and residential renovation — how FORMA Studio takes a commission from the first site walk to the one-year review.',
    image: services[0]?.imageUrl ?? '/img/services/architecture.jpg',
    path: '/services',
  })

  const index =
    services.length > 0 ? (
      <nav className="sv-index" aria-label="Jump to a discipline">
        <p className="label sv-index__label">On this page</p>
        <ol className="sv-index__list">
          {services.map((service, position) => (
            <li key={service.id ?? service.slug}>
              <a className="sv-index__link" href={`#${service.slug}`}>
                <span className="sv-index__i num" aria-hidden="true">
                  {pad(position + 1)}
                </span>
                <span className="sv-index__t">{service.title}</span>
                <span className="sv-index__d">{service.discipline}</span>
                <span className="sv-index__a" aria-hidden="true">
                  ↓
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    ) : null

  return (
    <>
      <Hero
        variant="title"
        kicker="Commission"
        title="Four ways to start working with the studio."
        lead="Each discipline is a different contract, a different length of time and a different set of drawings. Read the one that sounds like your problem — the scope lists are the real ones, not a sales pitch."
        count={loading ? '—' : services.length > 0 ? pluralize(services.length, 'discipline') : '—'}
      >
        {loading && !index && <SkeletonRows rows={4} height={58} />}
        {error && !loading && !index && <ErrorState error={error} onRetry={reload} />}
        {index}
      </Hero>

      <section className="sv-list" aria-label="The four disciplines">
        {loading && (
          <div className="wrap section section--tight">
            <Loading message="Loading the four disciplines…" />
          </div>
        )}

        {error && !loading && (
          <div className="wrap section section--tight">
            <ErrorState error={error} onRetry={reload} />
          </div>
        )}

        {data && services.length === 0 && (
          <div className="wrap section section--tight">
            <EmptyState
              title="No services are published right now."
              body="The studio takes commissions by conversation — write to us and we will explain how it would work."
              action={
                <Link className="btn" to="/contact">
                  Contact the studio
                </Link>
              }
            />
          </div>
        )}

        {services.map((service, position) => {
          const paragraphs = paragraphsOf(service.description)
          const scope = service.scope ?? []
          const detail = service.detail ?? []

          return (
            <article
              className={`sv-disc sv-disc--${position}`}
              id={service.slug}
              key={service.id ?? service.slug}
              aria-labelledby={`${service.slug}-title`}
            >
              <div className="wrap sv-disc__grid">
                <Reveal as="figure" className="figure sv-disc__media">
                  <Photo
                    src={service.imageUrl}
                    alt={service.imageAlt}
                    layout={position === 0 || position === 3 ? 'half' : 'cover'}
                    eager={position === 0}
                  />
                  <figcaption className="figure-cap">
                    <span className="label">Fig. {pad(position + 1)}</span>
                    <span className="sv-cap">{service.excerpt}</span>
                  </figcaption>
                </Reveal>

                <div className="sv-disc__body">
                  <header className="sv-disc__head">
                    <p className="sv-disc__i" aria-hidden="true">
                      {pad(position + 1)}
                    </p>
                    <div>
                      <h2 id={`${service.slug}-title`}>{service.title}</h2>
                      <p className="label sv-disc__disc">{service.discipline}</p>
                    </div>
                  </header>

                  <div className="stack sv-disc__text">
                    {paragraphs.map((paragraph, i) => (
                      <p key={i} className={i === 0 && position !== 1 ? 'lead' : undefined}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="sv-disc__cols">
                  <section className="sv-scope" aria-labelledby={`${service.slug}-scope`}>
                    <h3 className="label label--ink sv-h" id={`${service.slug}-scope`}>
                      What it covers
                    </h3>
                    {scope.length > 0 ? (
                      <ol className="sv-scope__list">
                        {scope.map((item, i) => (
                          <li className="sv-scope__row" key={item}>
                            <span className="sv-scope__n num" aria-hidden="true">
                              {pad(i + 1)}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="quiet">The scope list for this discipline is being written.</p>
                    )}
                  </section>

                  <aside className="sv-notes" aria-label={`Notes and conditions for ${service.title}`}>
                    <h3 className="label label--ink sv-h">Notes &amp; conditions</h3>
                    {detail.length > 0 ? (
                      <ul className="sv-notes__list">
                        {detail.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="quiet">No standing conditions recorded for this discipline.</p>
                    )}
                  </aside>
                </div>

                <p className="sv-disc__cta">
                  <ArrowLink to="/contact">Enquire about {service.title.toLowerCase()}</ArrowLink>
                  <span className="sv-disc__cta-note quiet">Two hours, no charge, in your space.</span>
                </p>
              </div>
            </article>
          )
        })}
      </section>

      <section className="wrap section section--tight" aria-labelledby="sv-next">
        <div className="cta-strip">
          <div>
            <p className="label label--ink">Next</p>
            <h2 id="sv-next" style={{ marginTop: 14 }}>
              Tell us which of the four this is.
            </h2>
          </div>
          <div className="hero__actions">
            <Link className="btn btn--clay" to="/contact">
              Start an enquiry
            </Link>
            <ArrowLink to="/about">How a commission runs</ArrowLink>
          </div>
        </div>
      </section>
    </>
  )
}
