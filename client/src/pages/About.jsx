import { Link } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Reveal from '../components/Reveal.jsx'
import ArrowLink from '../components/ArrowLink.jsx'
import { EmptyState, ErrorState, Loading, SkeletonPhoto, SkeletonRows } from '../components/StateBlock.jsx'
import { publicApi } from '../lib/api.js'
import { useApi, useSeo } from '../lib/hooks.js'
import { useSite } from '../lib/site-context.js'
import '../styles/about.css'

// Licensed studio photography that is not in the profile row, so the alt text
// lives beside the constant rather than being invented at render time.
const ATELIER = {
  src: '/img/about/atelier.jpg',
  alt: 'The FORMA drawing room — an exposed concrete frame, wool-upholstered chairs and a long working table under even north light',
}
const WORKSHOP = {
  src: '/img/about/workshop.jpg',
  alt: 'A card and ply study model of a sloped-roof house, cut to show the sections, photographed against black on the workshop bench',
}

const pad = (n) => String(n).padStart(2, '0')

export default function About() {
  const { studio, loading: siteLoading, error: siteError } = useSite()
  const team = useApi(() => publicApi.team(), [])

  useSeo({
    title: 'About the Studio',
    description:
      studio?.introBody?.[0] ??
      'FORMA is an architecture and interiors studio working from a fourth-floor apartment in Príncipe Real, Lisbon. Founded 2011, eleven people, one north-lit room.',
    image: ATELIER.src,
    path: '/about',
  })

  // The profile row is fetched once by App.jsx and has no reload in context, so
  // a failed site call recovers by re-mounting the page.
  const retrySite = () => window.location.reload()

  const process = studio?.process ?? []
  const stats = studio?.stats ?? []
  const members = team.data?.team ?? []

  return (
    <>
      <Hero
        variant="split"
        kicker={studio ? `Lisbon · Founded ${studio.foundedYear}` : 'The studio'}
        title={studio?.introTitle ?? 'About FORMA'}
        lead={studio?.heroLead}
        image={ATELIER}
        actions={
          <ArrowLink to="/services">What we take on</ArrowLink>
        }
      />

      {!studio &&
        (siteError ? (
          <div className="wrap section section--tight">
            <ErrorState error={siteError} onRetry={retrySite} />
          </div>
        ) : (
          <div className="wrap section section--tight">
            <Loading message={siteLoading ? 'Loading the studio profile…' : 'The studio profile is not available.'} />
          </div>
        ))}

      {studio && (
        <>
          {/* ---------- history: asymmetric narrative with a stat ledger ---------- */}
          <section className="section ab-history" aria-labelledby="ab-history-title">
            <div className="wrap grid grid--loose ab-history__grid">
              <div className="c-4 ab-history__rail">
                <p className="label label--ink">The room</p>
                <p className="ab-history__place">
                  {studio.street}
                  <br />
                  {studio.city}
                  <br />
                  {studio.country}
                </p>
                <p className="ab-history__since">
                  Est. {studio.foundedYear}
                </p>
                <ArrowLink to="/projects">Work in the portfolio</ArrowLink>
              </div>

              <div className="c-7 from-6 ab-history__body">
                <h2 id="ab-history-title">{studio.introTitle}</h2>
                <div className="stack">
                  {(studio.introBody ?? []).map((paragraph, index) => (
                    <Reveal key={index} delay={index * 90} as="div">
                      <p className={index === 0 ? 'lead' : undefined}>{paragraph}</p>
                    </Reveal>
                  ))}
                  <p className="ab-history__pull">
                    Between eight and twelve commissions a year, every one of them led by a partner.
                  </p>
                </div>
              </div>

              {stats.length > 0 && (
                <div className="c-12 ab-stats">
                  <dl className="ab-stats__row">
                    {stats.map((stat) => (
                      <div className="ab-stat" key={stat.label}>
                        <dt>{stat.label}</dt>
                        <dd>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </section>

          {/* ---------- one wide photograph, cut into the page ---------- */}
          {studio.philosophyImageUrl && (
            <section className="ab-strip" aria-label="The studio's own building">
              <div className="wrap">
                <figure className="figure ab-strip__figure">
                  <div className="bleed ab-strip__bleed">
                    <Photo src={studio.philosophyImageUrl} alt={studio.philosophyImageAlt} layout="full" />
                  </div>
                  <figcaption className="figure-cap">
                    <span className="label">{studio.city}</span>
                    <span className="ab-strip__cap">
                      Light is the one thing we specify before we specify a material.
                    </span>
                  </figcaption>
                </figure>
              </div>
            </section>
          )}

          {/* ---------- process: six numbered steps on hairlines ---------- */}
          <section className="section section--tight ab-process" aria-labelledby="ab-process-title">
            <div className="wrap grid ab-process__grid">
              <div className="c-4 ab-process__rail">
                <div>
                  <p className="label label--ink">Working process</p>
                  <h2 id="ab-process-title" className="ab-process__h">
                    Six steps, in the same order every time.
                  </h2>
                  <p className="quiet ab-process__note">
                    Nothing here is a stage gate we charge for. The first two steps happen before you have
                    committed to anything.
                  </p>
                  <Link className="btn" to="/contact">
                    Start at step one
                  </Link>
                </div>
              </div>

              {process.length === 0 ? (
                <div className="c-8 from-5">
                  <EmptyState title="The process has not been written up yet." body="Ask the studio directly and we will send the current stages." />
                </div>
              ) : (
                <ol className="c-8 from-5 ab-steps hairline-list">
                  {process.map((step, index) => (
                    <li className="ab-step" key={step.step ?? step.title}>
                      <Reveal as="div" className="ab-step__inner" delay={index * 60}>
                        <span className="ab-step__i" aria-hidden="true">
                          {step.step ?? pad(index + 1)}
                        </span>
                        <div className="ab-step__text">
                          <h3>{step.title}</h3>
                          <p className="measure">{step.body}</p>
                        </div>
                      </Reveal>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          {/* ---------- philosophy: carbon band, quotes, workshop model bleeding ---------- */}
          <section className="band ab-phil" aria-labelledby="ab-phil-title">
            <div className="wrap">
              <div className="ab-phil__grid">
                <div className="ab-phil__text">
                  <p className="label label--invert">What we hold onto</p>
                  <h2 id="ab-phil-title" className="ab-phil__h">
                    Three positions we will not trade away for a drawing.
                  </h2>
                  <ol className="ab-phil__list">
                    {(studio.philosophy ?? []).map((line, index) => (
                      <Reveal as="li" key={index} delay={index * 110} className="ab-phil__item">
                        <span className="ab-phil__i num" aria-hidden="true">
                          {pad(index + 1)}
                        </span>
                        <p className={index === 0 ? 'ab-phil__quote ab-phil__quote--lead' : 'ab-phil__quote'}>{line}</p>
                      </Reveal>
                    ))}
                  </ol>
                </div>

                <figure className="figure ab-phil__media">
                  <Photo src={WORKSHOP.src} alt={WORKSHOP.alt} layout="half" />
                  <figcaption className="figure-cap ab-phil__cap">
                    <span className="label">Concept model</span>
                    <span>Card and ply, 1:50, made before the second plan review.</span>
                  </figcaption>
                </figure>
              </div>
            </div>
          </section>

          {/* ---------- team: editorial list, full bios ---------- */}
          <section className="section ab-team" aria-labelledby="ab-team-title">
            <div className="wrap">
              <div className="ab-team__head">
                <div>
                  <p className="label label--ink">The people</p>
                  <h2 id="ab-team-title" className="ab-team__h">
                    Four of the eleven who sign the drawings.
                  </h2>
                </div>
                <p className="ab-team__count" aria-live="polite">
                  {team.loading ? 'Loading the studio list…' : team.data ? `${members.length} partners & associates` : '—'}
                </p>
              </div>

              {team.loading && (
                <div className="ab-team__state">
                  <SkeletonPhoto ratio="3 / 4" />
                  <SkeletonRows rows={3} height={96} />
                </div>
              )}
              {team.error && !team.loading && <ErrorState error={team.error} onRetry={team.reload} />}
              {team.data && members.length === 0 && (
                <EmptyState
                  title="No profiles published yet."
                  body="Write to the studio and we will introduce you to the people on your project."
                  action={
                    <Link className="btn" to="/contact">
                      Contact the studio
                    </Link>
                  }
                />
              )}

              {members.length > 0 && (
                <ul className="ab-team__list">
                  {members.map((member, index) => (
                    <li className={`ab-member ${index === 0 ? 'ab-member--lead' : ''}`} key={member.id ?? member.name}>
                      <div className="ab-member__media">
                        <Photo src={member.imageUrl} alt={member.imageAlt} layout={index === 0 ? 'cover' : 'third'} />
                      </div>
                      <div className="ab-member__id">
                        <h3 className="ab-member__name">{member.name}</h3>
                        <p className="label ab-member__role">{member.role}</p>
                        <p className="ab-member__i num">{pad(index + 1)}</p>
                      </div>
                      <div className="ab-member__body">
                        <p className={index === 0 ? 'ab-member__bio ab-member__bio--lead' : 'ab-member__bio'}>
                          {member.bio}
                        </p>
                        <p className="ab-member__links">
                          <a className="ab-member__mail" href={`mailto:${member.email}`}>
                            {member.email}
                          </a>
                          {member.linkedin && (
                            <a className="ab-member__mail" href={member.linkedin} target="_blank" rel="noreferrer">
                              LinkedIn
                            </a>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ---------- onward to the enquiry ---------- */}
          <section className="section section--tight ab-close" aria-labelledby="ab-close-title">
            <div className="wrap grid ab-close__grid">
              <div className="c-6 ab-close__say">
                <p className="label label--ink">Next</p>
                <h2 id="ab-close-title">Come and see the room, or start with an email.</h2>
                <p className="lead measure">
                  The first conversation is two hours in your space rather than ours, and it is not billable.
                </p>
                <div className="hero__actions ab-close__actions">
                  <Link className="btn btn--clay" to="/contact">
                    Start an enquiry
                  </Link>
                  <ArrowLink to="/services">Read the four disciplines</ArrowLink>
                </div>
              </div>

              <div className="c-5 from-8 ab-close__colophon">
                <dl className="meta">
                  <div>
                    <dt>Atelier</dt>
                    <dd>
                      {studio.street}, {studio.city}, {studio.country}
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a className="ab-close__link" href={`mailto:${studio.email}`}>
                        {studio.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Telephone</dt>
                    <dd>
                      <a className="ab-close__link" href={`tel:${studio.phone?.replace(/\s+/g, '')}`}>
                        {studio.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Hours</dt>
                    <dd>{studio.hours}</dd>
                  </div>
                  {(studio.instagram || studio.linkedin) && (
                    <div>
                      <dt>Elsewhere</dt>
                      <dd className="ab-close__social">
                        {studio.instagram && (
                          <a className="ab-close__link" href={studio.instagram} target="_blank" rel="noreferrer">
                            Instagram
                          </a>
                        )}
                        {studio.linkedin && (
                          <a className="ab-close__link" href={studio.linkedin} target="_blank" rel="noreferrer">
                            LinkedIn
                          </a>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  )
}
