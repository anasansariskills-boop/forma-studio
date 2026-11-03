import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Reveal from '../components/Reveal.jsx'
import ArrowLink from '../components/ArrowLink.jsx'
import ProjectIndex from '../components/ProjectIndex.jsx'
import TestimonialDeck from '../components/TestimonialDeck.jsx'
import { ErrorState, Loading, SkeletonRows } from '../components/StateBlock.jsx'
import { publicApi } from '../lib/api.js'
import { useApi, useSeo } from '../lib/hooks.js'
import { useSite } from '../lib/site-context.js'
import '../styles/home.css'

export default function Home() {
  const { studio } = useSite()
  const featured = useApi(() => publicApi.projects({ featured: 'true', perPage: 6 }), [])
  const services = useApi(() => publicApi.services(), [])
  const quotes = useApi(() => publicApi.testimonials({ featured: 'true' }), [])

  useSeo({
    title: 'FORMA Studio — Architecture & Interiors, Lisbon',
    description:
      studio?.heroLead ??
      'A Lisbon architecture and interiors studio designing quiet, low-energy buildings across Portugal, mostly by keeping what already stands.',
    image: studio?.heroImageUrl,
    path: '/',
    type: 'website',
  })

  return (
    <>
      <Hero
        variant="full"
        kicker={studio?.heroKicker ?? 'Lisbon · Founded 2011'}
        title={studio?.heroTitle ?? 'Buildings that hold the light.'}
        lead={studio?.heroLead}
        image={studio ? { src: studio.heroImageUrl, alt: studio.heroImageAlt } : null}
        actions={
          <Link className="btn" to="/projects">
            See the work
          </Link>
        }
        aside={
          <p className="hero__aside">
            {featured.data ? `${featured.data.pagination.total} published projects` : 'Portfolio loading'}
            <br />
            across architecture, interiors &amp; retrofit
          </p>
        }
      />

      {/* ---------- studio note ---------- */}
      <section className="section" aria-labelledby="studio-note">
        <div className="wrap home-intro">
          <div className="home-intro__side">
            <p className="label label--ink">{studio?.introKicker ?? 'The studio'}</p>
            {studio?.stats?.length > 0 && (
              <dl className="stats">
                {studio.stats.map((stat) => (
                  <div className="stat" key={stat.label}>
                    <b>{stat.value}</b>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </dl>
            )}
            <ArrowLink to="/about">About FORMA</ArrowLink>
          </div>

          <div className="home-intro__body">
            <Reveal>
              <h2 id="studio-note">{studio?.introTitle ?? 'A practice built on what already stands.'}</h2>
            </Reveal>
            {(studio?.introBody ?? []).map((paragraph, index) => (
              <Reveal key={index} delay={index * 90}>
                <p className={index === 0 ? 'lead' : undefined}>{paragraph}</p>
              </Reveal>
            ))}
            {studio?.introImageUrl && (
              <Reveal>
                <Photo src={studio.introImageUrl} alt={studio.introImageAlt} layout="cover" />
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* ---------- selected work ---------- */}
      <section className="section section--tight" aria-labelledby="selected-work">
        <div className="wrap">
          <div className="side-by-side" style={{ justifyContent: 'space-between', marginBottom: 'clamp(26px,3vw,44px)' }}>
            <h2 id="selected-work">Selected work</h2>
            <ArrowLink to="/projects">All {featured.data?.pagination?.total ?? '—'} projects</ArrowLink>
          </div>

          {featured.loading && <SkeletonRows rows={5} height={78} />}
          {featured.error && <ErrorState error={featured.error} onRetry={featured.reload} />}
          {featured.data && featured.data.projects.length === 0 && (
            <p className="quiet">Nothing published yet — the portfolio is being prepared.</p>
          )}
          {featured.data && featured.data.projects.length > 0 && <ProjectIndex projects={featured.data.projects} />}
        </div>
      </section>

      {/* ---------- services ledger ---------- */}
      <section className="section section--tight band" aria-labelledby="services-list">
        <div className="wrap">
          <div className="side-by-side" style={{ justifyContent: 'space-between', marginBottom: 'clamp(24px,3vw,40px)' }}>
            <h2 id="services-list">What we do</h2>
            <ArrowLink to="/services" invert>
              Four disciplines
            </ArrowLink>
          </div>

          {services.loading && <Loading message="Loading services…" />}
          {services.error && <ErrorState error={services.error} onRetry={services.reload} />}

          {services.data && (
            <ol className="ledger">
              {services.data.services.map((service, index) => (
                <li key={service.id}>
                  <Link to="/services" className="ledger__row">
                    <span className="ledger__i num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="ledger__title">
                      {service.title}
                      <em>{service.discipline}</em>
                    </span>
                    <span className="ledger__excerpt">{service.excerpt}</span>
                    <span className="ledger__arrow" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ---------- philosophy ---------- */}
      <section className="section" aria-labelledby="philosophy">
        <div className="wrap philosophy">
          <div>
            <p className="label label--ink">How we think</p>
            <h2 id="philosophy" className="sr-only">
              Philosophy
            </h2>
            <div style={{ marginTop: 'clamp(20px,2.6vw,34px)' }}>
              {(studio?.philosophy ?? []).map((line, index) => (
                <Reveal key={index} delay={index * 110}>
                  <p className="philosophy__quote">{line}</p>
                </Reveal>
              ))}
            </div>
            <p className="philosophy__by">
              <span>{studio?.city ?? 'Lisbon'}</span>
              <span>Since {studio?.foundedYear ?? 2011}</span>
            </p>
          </div>

          {studio?.philosophyImageUrl && (
            <div className="philosophy__media">
              <Photo src={studio.philosophyImageUrl} alt={studio.philosophyImageAlt} layout="half" />
            </div>
          )}
        </div>
      </section>

      {/* ---------- testimonials ---------- */}
      <section className="section section--tight" aria-labelledby="clients">
        <div className="wrap wrap--narrow">
          <p className="label label--ink" id="clients">
            What clients say
          </p>
          <div style={{ marginTop: 26 }}>
            {quotes.loading && <SkeletonRows rows={2} height={140} />}
            {quotes.error && <ErrorState error={quotes.error} onRetry={quotes.reload} />}
            {quotes.data && <TestimonialDeck testimonials={quotes.data.testimonials} />}
          </div>
        </div>
      </section>

      {/* ---------- enquiry ---------- */}
      <section className="wrap" aria-labelledby="enquire">
        <div className="cta-strip">
          <div>
            <p className="label label--ink">Next</p>
            <h2 id="enquire" style={{ marginTop: 14 }}>
              Have a site, a building or a room that is not working?
            </h2>
          </div>
          <div className="hero__actions">
            <Link className="btn btn--clay" to="/contact">
              Start an enquiry
            </Link>
            <ArrowLink to="/projects">Look at the portfolio first</ArrowLink>
          </div>
        </div>
      </section>
    </>
  )
}
