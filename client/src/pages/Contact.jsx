import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Hero from '../components/Hero.jsx'
import Photo from '../components/Photo.jsx'
import Reveal from '../components/Reveal.jsx'
import InquiryForm from '../components/InquiryForm.jsx'
import ArrowLink from '../components/ArrowLink.jsx'
import { EmptyState, ErrorState, SkeletonPhoto, SkeletonRows } from '../components/StateBlock.jsx'
import { useSeo } from '../lib/hooks.js'
import { useSite } from '../lib/site-context.js'
import { PROJECT_TYPES, humanize } from '../lib/format.js'
import '../styles/contact.css'

/**
 * The one asset on this page that is not served by the API: the roof-terrace
 * photograph has no StudioProfile field behind it. Alt text is written here
 * because the database carries no alt for it.
 */
const STUDIO_IMAGE = '/img/contact/studio.jpg'
const STUDIO_IMAGE_ALT =
  'View from the atelier roof terrace: Lisbon roof tiles in terracotta, a white baroque church beyond, the Tejo on the horizon'

/** Survey-style site reference for the schematic locator (the API has no coordinates). */
const SITE_REFERENCE = '38.7128° N / 9.1465° W'

/** Editorial checklist — the questions a partner actually asks on the first call. */
const BRIEF = [
  {
    title: 'Where the site is',
    body: 'Parish and street are enough to start. A terrace off Bairro Alto we can walk to in an hour; a house in the Alentejo we plan the trip around before we plan the meeting.',
  },
  {
    title: 'Roughly how big',
    body: 'A remembered figure in square metres is fine — per floor is better. Area is what turns a wish into a programme, and we measure it properly on the survey anyway.',
  },
  {
    title: 'What already stands',
    body: 'Year of construction, how it is built, what has been altered since, and the parts you refuse to lose. Most commissions here begin by keeping something, not by clearing a plot.',
  },
  {
    title: 'What is wrong with it',
    body: 'The cold room, the damp wall, the stair that arrives nowhere, the light that shows up at the wrong hour. Your complaint is the brief — describe it the way you would say it on site.',
  },
  {
    title: 'What you cannot change',
    body: 'A protected façade, shared party walls, a decision already filed with the câmara, a ceiling on the budget, a partner who also has to say yes. Constraints are not obstacles; they are half the design.',
  },
  {
    title: 'When it needs to happen',
    body: 'A date, an event, or honestly “no fixed date”. It decides who picks up the first drawing and how much time the survey can take.',
  },
]

const TYPE_KEYS = Object.keys(PROJECT_TYPES)

/** `?type=` arrives as NEW_BUILD, new-build, Interior … — anything unknown is dropped. */
const readProjectType = (value) => {
  if (!value) return ''
  const key = String(value).trim().toUpperCase().replace(/[-\s]+/g, '_')
  return TYPE_KEYS.includes(key) ? key : ''
}

const telHref = (value) => `tel:${String(value).replace(/[^\d+]/g, '')}`

const hasContactDetails = (studio) =>
  Boolean(studio?.street || studio?.city || studio?.email || studio?.phone || studio?.hours)

const REFERENCE_PARAMS = ['subject', 'project', 'type']

export default function Contact() {
  const { studio, portfolio, loading, error } = useSite()
  const [params, setParams] = useSearchParams()

  const subject = (params.get('subject') ?? '').trim()
  const projectSlug = (params.get('project') ?? '').trim()
  const reference = subject || (projectSlug ? humanize(projectSlug) : '')
  const defaultProjectType = useMemo(() => readProjectType(params.get('type')), [params])

  useSeo({
    title: 'Contact — Start an Enquiry',
    description:
      'Write to FORMA Studio about a site, a building or a single room in Portugal. Every enquiry is read by a partner and answered within two working days.',
    image: STUDIO_IMAGE,
    path: '/contact',
  })

  /**
   * The visitor arrived from a project page, so the reference is context they
   * already gave us — keep it on screen rather than asking them to retype it.
   * `InquiryForm` owns its field state, so the reference is shown as a line
   * above the form instead of being injected into the message textarea.
   */
  const clearReference = () =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        REFERENCE_PARAMS.forEach((key) => next.delete(key))
        return next
      },
      { replace: true },
    )

  const details = studio ? (
    hasContactDetails(studio) ? (
      <>
        <address className="ct-address">
          <span className="label">The atelier</span>
          <span className="ct-address__body">
            {studio.street && <span>{studio.street}</span>}
            {studio.city && <span>{studio.city}</span>}
            {studio.country && <span>{studio.country}</span>}
          </span>
        </address>

        <ul className="ct-facts">
          {studio.hours && (
            <li>
              <span className="label">Hours</span>
              <span>{studio.hours}</span>
            </li>
          )}
          {studio.email && (
            <li>
              <span className="label">Write</span>
              <a href={`mailto:${studio.email}`}>{studio.email}</a>
            </li>
          )}
          {studio.phone && (
            <li>
              <span className="label">Call</span>
              <a href={telHref(studio.phone)}>{studio.phone}</a>
            </li>
          )}
          {studio.instagram && (
            <li>
              <span className="label">Instagram</span>
              <a href={studio.instagram} target="_blank" rel="noreferrer noopener">
                {studio.instagram.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </li>
          )}
          {studio.linkedin && (
            <li>
              <span className="label">LinkedIn</span>
              <a href={studio.linkedin} target="_blank" rel="noreferrer noopener">
                {studio.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            </li>
          )}
          {studio.foundedYear && (
            <li>
              <span className="label">Practising since</span>
              <span className="num">{studio.foundedYear}</span>
            </li>
          )}
        </ul>

        <div className="ct-plan">
          <p className="label">Locator — schematic, not to scale</p>
          <svg className="ct-plan__svg" viewBox="0 0 280 152" role="img" aria-label={
            `Schematic roof plan of the block at ${[studio.street, studio.city].filter(Boolean).join(', ')}. ` +
            'The atelier is the clay square in the lower-left building, north is to the top of the drawing, the scale bar is ten metres.'
          }>
            <g className="ct-plan__mass">
              <rect x="16" y="16" width="88" height="50" />
              <rect x="118" y="10" width="60" height="42" />
              <rect x="192" y="24" width="46" height="40" />
              <rect x="16" y="90" width="88" height="46" />
              <rect x="118" y="88" width="70" height="48" />
              <rect x="202" y="98" width="36" height="38" />
            </g>
            <path className="ct-plan__street" d="M0 79H262" />
            <g className="ct-plan__mark">
              <rect x="50" y="104" width="16" height="16" />
              <path d="M66 112h20" />
            </g>
            <text x="88" y="115">ATELIER · 4º</text>
            <g className="ct-plan__north">
              <path d="M268 14v30" />
              <path d="M268 14l-4.5 9h9z" />
              <text x="268" y="56">N</text>
            </g>
            <g className="ct-plan__scale">
              <path d="M16 142h60" />
              <path d="M16 138v8M46 138v8M76 138v8" />
              <text x="82" y="145">10 m</text>
            </g>
          </svg>
          <p className="ct-plan__ref">
            <span className="num">{SITE_REFERENCE}</span>
            <span className="quiet">approx.</span>
            <span>{[studio.city, studio.country].filter(Boolean).join(', ')}</span>
          </p>
        </div>
      </>
    ) : (
      <EmptyState
        title="The studio has not published its address yet."
        body="The enquiry form still reaches us — it goes to the same inbox."
        action={<ArrowLink to="/projects">Look at the work meanwhile</ArrowLink>}
      />
    )
  ) : null

  return (
    <>
      <Hero
        variant="title"
        kicker="Contact"
        title="Start with the site, not the style."
        lead="A partner reads every enquiry — there is no inbox nobody checks. Tell us what is wrong with the building and we will tell you whether we are the right practice for it, including when the answer is no."
        count={loading ? '—' : studio ? 'Replies within two working days' : 'Details unavailable'}
      >
        {loading ? (
          <SkeletonRows rows={1} height={44} />
        ) : (
          studio &&
          (studio.email || studio.phone || studio.hours) && (
            <ul className="ct-lines">
              {studio.email && (
                <li>
                  <span className="label">Write</span>
                  <a href={`mailto:${studio.email}`}>{studio.email}</a>
                </li>
              )}
              {studio.phone && (
                <li>
                  <span className="label">Call</span>
                  <a href={telHref(studio.phone)}>{studio.phone}</a>
                </li>
              )}
              {studio.hours && (
                <li>
                  <span className="label">Atelier hours</span>
                  <span>{studio.hours}</span>
                </li>
              )}
            </ul>
          )
        )}
      </Hero>

      {/* ---------- working layout: enquiry left, studio rail right ---------- */}
      <section className="wrap ct-work" aria-labelledby="ct-enquiry">
        <div className="ct-ask">
          {reference && (
            <p className="ct-ref">
              <span className="ct-ref__label label">Referring to</span>
              <span className="ct-ref__text">Re: {reference}</span>
              <span className="ct-ref__actions">
                {projectSlug && (
                  <ArrowLink to={`/projects/${projectSlug}`}>Open project</ArrowLink>
                )}
                <button type="button" className="ct-ref__clear" onClick={clearReference}>
                  Not this one
                </button>
              </span>
            </p>
          )}

          <h2 id="ct-enquiry">Project enquiry</h2>
          <p className="ct-ask__note">
            Four fields carry the weight — name, email, the type of project and the paragraph about the
            building. Budget, start date and phone number are optional and never decide whether we reply.
          </p>

          <InquiryForm
            source="website"
            defaultProjectType={defaultProjectType || undefined}
            onSuccess={clearReference}
          />

          {studio?.process?.[0] && (
            <Reveal className="ct-first" as="p">
              <span className="label label--ink">
                Step {studio.process[0].step} — {studio.process[0].title}
              </span>
              <span>{studio.process[0].body}</span>
            </Reveal>
          )}
        </div>

        <aside className="ct-rail" aria-label="Studio contact details">
          <figure className="figure ct-rail__figure">
            <Photo
              src={STUDIO_IMAGE}
              alt={STUDIO_IMAGE_ALT}
              layout="third"
              sizes="(max-width: 980px) calc(100vw - 2 * var(--gutter)), 320px"
              width={1280}
              height={1600}
            />
            <figcaption className="figure-cap">
              <span className="label">From the roof</span>
              <span>{[studio?.street, studio?.city].filter(Boolean).join(' · ') || 'Lisbon'}</span>
            </figcaption>
          </figure>

          {loading && (
            <div className="ct-rail__skeleton" aria-hidden="true">
              <SkeletonRows rows={5} height={52} />
            </div>
          )}
          {error && (
            <>
              <ErrorState error={error} />
              <p className="field-hint">Studio lines are offline, but the enquiry form above still posts to the same inbox.</p>
            </>
          )}
          {!loading && !error && details}
        </aside>
      </section>

      {/* ---------- what to tell us ---------- */}
      <section className="wrap ct-guide" aria-labelledby="ct-guide-title">
        <div className="ct-guide__head">
          <p className="label label--ink">Before you write</p>
          <h2 id="ct-guide-title">What makes the first reply useful</h2>
          <p className="lead measure">
            We do not ask for a style, a mood board or a reference photograph. Six things do more for
            a first scheme than any image, and none of them need to be exact.
          </p>
          {portfolio?.total > 0 && (
            <p className="ct-guide__aside">
              Unsure whether this is the right practice? {portfolio.total} built projects are
              published — <ArrowLink to="/projects">read the ones nearest yours</ArrowLink>.
            </p>
          )}
        </div>

        <ol className="ct-brief">
          {BRIEF.map((item, index) => (
            <Reveal as="li" key={item.title} delay={index * 60} className="ct-brief__item">
              <span className="ct-brief__i" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="ct-brief__text">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>
    </>
  )
}
