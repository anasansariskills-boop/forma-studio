# FORMA Studio — client-side contract

Read this before touching `client/src`. It is the shared ground every page is
built on. If something here is wrong, fix the page you own, not the shared files.

## Stack

Vite 7 + React 19 + react-router-dom 7. No CSS framework, no animation library,
no HTTP library. Dev: API on `http://localhost:8787`, Vite on `:5173` with the
proxy already configured for `/api`, `/uploads`, `/sitemap.xml`.

```
client/src/
  main.jsx            mounts <App/>
  App.jsx             routes, <SiteContext>, lazy-loads the admin app
  lib/api.js          publicApi + adminApi + ApiError   ← all fetch goes here
  lib/hooks.js        useApi, useSeo, useReveal, useScrolled, useBodyLock
  lib/site-context.js useSite() -> { studio, portfolio, loading, error }
  lib/images.js       variant/srcset helpers (used by <Photo/>)
  lib/format.js       label maps, date/area formatters
  components/         shared UI (see below)
  pages/              one file per public route
  admin/              the dashboard app (own folder, own CSS entry)
  styles/
    base.css          tokens, reset, type scale      ┐ do not edit — shared,
    layout.css        .wrap .grid .c-* .split .band  │ already relied on by
    hero.css          <Hero/> variants               │ every page
    site.css          shared component vocabulary    ┘
    index.css         entry: imports the four above
    home.css projects.css project-detail.css notfound.css   (per-page, owned)
```

**Never edit `base.css`, `layout.css`, `hero.css`, `site.css`, `index.css`,
`App.jsx`, or anything in `lib/` or `components/`.** New styles go in *your*
page's own CSS file, imported by that page component. If you genuinely need a
shared change, say so in your report instead of doing it.

Name your classes so they cannot collide: prefix them (`ab-`, `sv-`, `ct-`,
`adm-`). Everything in the stylesheet inventory below is already global.

## Data

All content comes from the API. Nothing is hard-coded except layout text.

| Hook call | Returns |
| --- | --- |
| `useSite()` | `{ studio, portfolio, loading, error }` — studio is the whole `StudioProfile` row, already fetched once by `App.jsx` |
| `useApi(() => publicApi.projects({ category, search, sort, page, perPage }), [deps])` | `{ projects, pagination: {page,perPage,total,pages}, categories: {ARCHITECTURE: 5, …} }` |
| `useApi(() => publicApi.project(slug), [slug])` | `{ project, navigation: { previous, next } }` |
| `useApi(() => publicApi.services(), [])` | `{ services: [ … ] }` |
| `useApi(() => publicApi.testimonials({ featured: 'true' }), [])` | `{ testimonials: [ … ] }` — each may carry `project: { slug, title }` |
| `useApi(() => publicApi.team(), [])` | `{ team: [ … ] }` |

`useApi` gives `{ data, loading, error, reload }`. It does not poll.

`studio` fields: `heroKicker heroTitle heroLead heroImageUrl heroImageAlt
introKicker introTitle introBody[] introImageUrl introImageAlt philosophy[]
philosophyImageUrl philosophyImageAlt process[{step,title,body}]
stats[{value,label}] street city country email phone hours instagram linkedin
foundedYear`.

`service` fields: `slug title discipline excerpt description scope[] detail[]
imageUrl imageAlt sortOrder published`. `description` contains `\n\n` between
paragraphs — split on `/\n{2,}/`.

`teamMember`: `name role bio imageUrl imageAlt email linkedin`.
`testimonial`: `quote author role company rating project`.

Project fields: `slug title excerpt category status location country year
areaSqm coverImageUrl coverImageAlt featured tags[] description client
materials[] images[{id,url,alt,caption,width,height,sortOrder}]`.
Category enum `ARCHITECTURE INTERIOR COMMERCIAL RENOVATION`; status enum
`COMPLETED IN_CONSTRUCTION IN_DESIGN`. Use `categoryLabel()` / `statusLabel()` /
`area()` / `formatDate()` / `pluralize()` from `lib/format.js` rather than
re-deriving them.

## Shared components

```jsx
<Hero variant="full|split|title" kicker title TitleTag lead image={{src,alt}} actions aside count children />
<Photo src alt layout="full|half|third|cover" eager width height className />
<Reveal delay={ms} as="div" className>            fades in on scroll
<ArrowLink to | href invert>                      hairline link + arrow
<ProjectIndex projects startAt />                 editorial list w/ cursor preview
<ProjectCard project eager />                     mosaic figure
<FilterBar categories active total onChange />    category chips with counts
<TestimonialDeck testimonials invert />           auto-advancing quotes
<InquiryForm source="website" defaultProjectType compact onSuccess />  the working form
<StateBlock kind="loading|error|empty" />         + Loading / ErrorState / EmptyState / SkeletonRows / SkeletonPhoto
```

`<Photo>` handles the `.jpg / .webp / -sm.jpg / -sm.webp` quartet and the `w`
descriptors. Never write a raw `<img srcset>` yourself. `eager` is for
above-the-fold only.

Every page calls `useSeo({ title, description, image, path, type })` once.
`title` may omit the `— FORMA Studio` suffix; it is appended.

## Visual language

Contemporary editorial architecture-monograph. Warm paper `#f4f0e9`, carbon ink
`#17140f`, one clay accent `#9c5b3b`. Fraunces (serif display) for headings and
pull quotes, Archivo for everything else. Labels are Archivo 0.6875rem, weight
600, `letter-spacing .17em`, uppercase — that is the `.label` class.

Type scale tokens exist for every size: `--fs-display --fs-h1 --fs-h2 --fs-h3
--fs-lead --fs-body --fs-small --fs-label`, all `clamp()`-based and
already wired to `h1..h4` and to the utility classes `.display .h1 .h2 .h3`.
Space with `--section --gutter --measure` rather than invented pixel values.
Motion is `--ease`, `--dur`, `--dur-fast`; `prefers-reduced-motion` is already
neutralised globally in `base.css`.

Rules that come from the client's brief and are not negotiable:

- No glassmorphism, no gradients-as-decoration, no floating blobs, no rounded
  corners beyond the 2px already in the system, no drop shadows except the ones
  already defined.
- No rows of identical cards. Services are a numbered ledger, team is an
  editorial list with hairlines, projects are an index or a deliberately uneven
  mosaic. Break a repeating pattern as soon as it reaches four alike.
- Every page has its own composition. Two pages must not open the same way.
- Wide imagery, strong hierarchy, generous whitespace, asymmetric spans
  (`.c-7` + `.c-4` + `from-2`, not three equal columns).
- Hover states are considered: 1px underline reveals, a 1.045 image scale, a
  row background shift. Nothing bounces.

## Responsive

Design phone layouts on purpose — do not rely on the desktop grid collapsing.
`layout.css` already drops the 12-col grid to 6 at 1020px and 4 at 620px, and
`site.css` hides `.nav` in favour of `.burger` at 860px. Add your own
`@media` blocks in your page file; typical breakpoints are 980, 860, 620, 520.
Re-check at 360px: nothing may overflow horizontally
(`document.documentElement.scrollWidth` must equal `clientWidth`).

## Accessibility

Semantic landmarks (`header nav main section article aside footer`), one `h1`
per page, headings in order, real `<label for>` on every input, `alt` text from
the database (never decorative `alt=""` for content photos), `aria-current`
handled by `NavLink`, focus visible via the global `:focus-visible` ring,
`aria-live` on anything that changes without a click, and keyboard paths for
every interaction. The drawer is `aria-hidden` when closed and closes on
`Escape`.

## States

Loading, error and empty are required everywhere content is fetched — use the
`StateBlock` exports. `useApi` surfaces `error` as an `ApiError` with
`.status` and `.message` already fit for display.

## Verification you must do yourself

The dev servers are already running (`npm run dev:server`, `npm run dev:client`
from the repo root). Load your page at `http://localhost:5173/<route>`, check
the browser console for errors, and confirm the DOM actually contains what you
claim. Note: `window.scrollTo()` does not animate in a background/hidden tab
because `html` sets `scroll-behavior: smooth` — temporarily set
`document.documentElement.style.scrollBehavior = 'auto'` before measuring
scroll-dependent behaviour.

Do not report a feature as working unless you observed it working.

---

# Admin dashboard (`/admin`)

A separate app under `client/src/admin/`, lazy-loaded by `App.jsx` at the
`/admin/*` route, with its own `admin.css` entry so public visitors never
download it. Use nested `<Routes>` with relative paths (`/`, `/projects`,
`/projects/:id`, `/inquiries`, …) — the parent `*` already scopes them.

`adminApi` in `lib/api.js` is the complete, verified surface; read it before
writing a call. The token lives in `sessionStorage` under `forma.admin.token`
and every admin request sends `Authorization: Bearer <token>`. Login returns
`{ token, admin }`; there is **no** logout endpoint (the JWT is stateless, so
signing out is `adminApi.clearToken()`). `adminApi.session()` validates a
stored token against a live admin row and returns `{ admin }`.

Guarded routes: `GET /admin/analytics/overview`, `GET|PATCH /admin/studio`,
`POST /admin/studio/media` (`images` multi-file field, up to 4), full CRUD on
`/admin/projects|services|testimonials|inquiries`, plus the project image
endpoints. Unauthenticated calls get 401; a forged or expired token also gets
401 — clear the token and bounce to the login screen when that happens.

Analytics payload: `{ totals: {projects, published, drafts, images, services,
testimonials, team, inquiries, newInquiries, replied}, portfolio: {byCategory,
byStatus, featured}, demand: {byProjectType, byBudget}, pipeline:
{byStatus, totalValueNone}, series: {months: [{label, inquiries}], days:
[{label, inquiries}]}, recent: {inquiries: [...], projects: [...]}, admin:
{name, email, lastLoginAt} }`. Render the two series as small inline SVG or
CSS bars — no charting dependency.

Inquiries: `adminApi.inquiries({ status, search, page, perPage })` returns
`{ inquiries, pagination, counts }`. `counts` includes every status plus `ALL`.
Each row carries `excerpt`/`truncated` instead of the full `message`; opening a
row (`adminApi.inquiry(id)`) returns the full body and the server flips `NEW`
to `READ` as a side effect, so refresh the list after viewing.

Image upload: `adminApi.uploadImages(projectId, fileList)` with a real
`<input type="file" multiple accept="image/*">`; the server re-encodes to the
four variants and returns the created rows. Reorder with
`adminApi.reorderImages(id, orderedImageIds)` and set the cover with
`adminApi.setCover(id, imageId)`. Deleting an image or project also deletes its
files server-side, so every destructive action needs an explicit confirmation
step in the UI.

Dashboard styling is intentionally NOT the marketing site: same palette and
type, but a dense working interface — sidebar nav, tables, filters, inline
validation, toast-style feedback. Keep the 2px radius, hairlines and clay
accent. It must look like the same practice's internal tool, not a generic
admin template. All the responsive, accessibility and state rules above apply
unchanged, including a usable layout at 380px wide.
