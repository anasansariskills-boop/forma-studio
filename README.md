# FORMA Studio

A full-stack website for a fictional premium architecture and interiors studio: an
editorial public site, a REST API over PostgreSQL, and a separate admin dashboard
for the studio's own content.

Projects, services, testimonials, team members, the studio profile and contact
details are read from the database rather than duplicated as React fixture data.

```
React 19 + Vite 7  →  Express 5 + Zod 4  →  Prisma 6  →  PostgreSQL 16
```

---

## Quick start

Requires Node.js 20 or newer. No Docker, no admin rights, no system PostgreSQL —
the database is a real PostgreSQL 16 server that npm installs into `node_modules`.

```bash
npm install                     # also installs the Postgres binaries
cp server/.env.example server/.env   # Windows CMD: copy server\.env.example server\.env
npm run db:init                 # create .pgdata cluster + "forma" database
npm run migrate                 # create the schema (8 tables)
npm run seed                    # 12 projects, 4 services, 6 testimonials, 4 team, 16 inquiries
npm run dev                     # database + API + client, one command, Ctrl+C stops all
```

| Surface | URL |
| --- | --- |
| Public site | <http://localhost:5173> |
| Admin dashboard | <http://localhost:5173/admin> |
| API health | <http://localhost:8787/api/health> |
| PostgreSQL | `localhost:55432`, database `forma` |

Sign in with the seeded account:

```
studio@forma-studio.com
FormaStudio#2026
```

Change it immediately from **Settings → Account security** in the dashboard, and
set `SEED_ADMIN_PASSWORD` in `server/.env` before seeding anywhere real.

### Step-by-step, if `npm run dev` is not your thing

```bash
npm run db:start     # foreground PostgreSQL — run in its own terminal
npm run dev:server   # API on 8787, --watch
npm run dev:client   # Vite on 5173
```

Vite proxies `/api`, `/uploads`, `/sitemap.xml` and `/robots.txt` to the API, so
the browser only ever talks to one origin during development.

---

## Scripts

Root `package.json` orchestrates the two workspaces.

| Command | What it does |
| --- | --- |
| `npm run dev` | Boots the database, API and client together and supervises them |
| `npm run setup` | `db:init` → `migrate` → `seed` in one line |
| `npm run db:init` / `db:start` / `db:stop` / `db:status` | Control the embedded PostgreSQL server |
| `npm run migrate` | Apply migrations (`prisma migrate dev` in development) |
| `npm run seed` | Re-seed the database. Destructive: it clears content tables first |
| `npm run build` | Production client bundle into `client/dist` |
| `npm start` | Production server: API **and** built client from one origin |
| `npm run test:api` | 48-assertion end-to-end API test against the running stack |
| `npm run dev:server` / `dev:client` | Run one half of the stack on its own |
| `npm run studio --workspace server` | Prisma Studio, a data browser on port 5555 |

`npm run test:api` needs the database and API running, and **a freshly restarted
API** — the contact and login rate limiters are in-memory, so a previous run
counts against the 429 assertions.

---

## Layout

```
├── client/                 React SPA
│   ├── index.html          SEO metadata, JSON-LD, favicon
│   ├── public/
│   │   ├── favicon.svg
│   │   └── img/            66 photographs × 4 variants = 264 files
│   └── src/
│       ├── App.jsx         routes; the /admin chunk is lazy-loaded
│       ├── components/     12 shared components (Photo, Hero, InquiryForm, …)
│       ├── lib/            api client, hooks, image variants, formatting
│       ├── pages/          Home, Projects, ProjectDetail, About, Services, Contact, NotFound
│       ├── admin/          the dashboard — its own shell, its own components
│       └── styles/         base · layout · hero · site (shared) + one file per page
├── server/                 Express API
│   ├── prisma/             schema.prisma, migrations/, seed.js
│   ├── uploads/            what the admin dashboard writes (git-ignored)
│   └── src/
│       ├── app.js          helmet, CORS, static, routes, error handler
│       ├── config.js       env parsing + startup validation
│       ├── lib/            auth, prisma, validation, slugs, storage
│       ├── middleware/     auth, validate, rate-limit, logger
│       └── routes/         public · inquiries · sitemap · admin/*
├── scripts/                db.mjs · dev.mjs · smoke-test.mjs · build-images.mjs
└── docs/                   CLIENT-CONTRACT · DEPLOYMENT · IMAGE-LICENSES
```

### Why the CSS is split the way it is

`styles/index.css` pulls in the four shared layers — `base.css` (tokens, reset,
type scale), `layout.css` (page shells, the 12-column grid, hairlines),
`hero.css` and `site.css` (every component rule used by more than one page).
Each page then owns a further file, `styles/<page>.css`, imported by that page's
component, holding a vocabulary nothing else sees.

Keeping the shared rules in one place is what lets a page that has never been
visited still render correctly: `ProjectCard` is styled in `site.css` because
Home, the project index and the "more work" rail all use it, while
`.pj-toolbar` belongs to `projects.css` alone. Rules that must be visible to
several routes never live in one route's file.

---

## Data model

Eight tables, three enums, real foreign keys.

```
AdminUser        email · passwordHash (bcrypt, cost 12) · name · role · lastLoginAt
StudioProfile    single row (id "default"): contact details, socials, stats, hero copy
Project     ┐    slug · category · status · year · location · areaSqm · materials
            │    excerpt · description · client · coverImageUrl · published · sortOrder
  └─ ProjectImage[]   url · webpUrl · smallUrl · smallWebpUrl · width · height · alt · sortOrder
  └─ Testimonial[]    a quote may belong to a project (onDelete: SetNull)
Service          slug · title · summary · body · scope[] · detail[] · imageUrl · sortOrder
Testimonial      quote · author · role · company · rating · featured · projectId
TeamMember       name · role · bio · imageUrl · published · sortOrder
ContactInquiry   name · email · phone · company · projectType · budget · timeline
                 location · message · source · status (NEW/READ/REPLIED/ARCHIVED)
```

Migrations are checked in under `server/prisma/migrations`, so a fresh database
is built with `prisma migrate deploy` rather than `db push`.

---

## API

Public, read-only, published content only:

```
GET  /api/site               studio profile + portfolio counts (one round trip for the chrome)
GET  /api/projects           ?category=&status=&featured=&search=&sort=&page=&perPage=
GET  /api/projects/:slug     project + ordered gallery + linked testimonials + prev/next
GET  /api/services
GET  /api/testimonials       ?featured=true
GET  /api/team
POST /api/inquiries          the contact form (rate-limited to 8 per 15 min per IP)
GET  /sitemap.xml            published projects, served as XML
GET  /robots.txt
GET  /api/health             DB reachability probe
```

Admin, all under `/api/admin/*` and all behind `Authorization: Bearer <jwt>`:

```
POST   /auth/login · GET /auth/session · POST /auth/password
GET    /analytics/overview                       counts, 30-day and 12-month series
GET    /projects · POST /projects · GET|PATCH|DELETE /projects/:id
POST   /projects/:id/images          multipart, field "images", up to 8 files
PATCH  /projects/:id/images/:imageId · DELETE …/images/:imageId
PATCH  /projects/:id/images/order · POST /projects/:id/cover
/services · /testimonials · /inquiries — same shape, plus PATCH status on inquiries
GET|PATCH /studio · POST /studio/media
```

Every request body, query and route parameter passes through a Zod schema in
`server/src/lib/validation.js` before it reaches Prisma. Validation failures
return `400` with a `details` array of `{ field, message }`, which the client
maps straight onto the form fields. Unknown `/api/*` paths return a JSON 404;
unexpected errors are normalised by one error handler that knows how to speak
about Multer, Zod and the five Prisma error codes the app can actually hit.

---

## Admin dashboard

`/admin` is a separate interface inside the same bundle, split by a lazy route so
public visitors never download it.

- **Sign in** against `AdminUser`, JWT (HS256, 8 h) kept in `sessionStorage` so a
  shared machine does not keep the token after the tab closes.
- **Overview** — totals, inquiry pipeline, portfolio by category, demand by
  project type, 30-day and 12-month inquiry series, recent activity.
- **Projects** — search and filter, create/edit/delete, publish toggle, image
  upload with alt text, drag-free reordering, cover selection.
- **Services / Testimonials** — full CRUD with publish and sort order.
- **Inquiries** — filter by status, search by name/email, read the full message,
  move `NEW → READ → REPLIED / ARCHIVED`. Marking as read is a real write.
- **Studio** — the contact details, hours and socials the public site renders.
- **Account** — change password (verifies the current one).

The token is stored per session and attached by the API client in
`client/src/lib/api.js`; a `401` anywhere sends the dashboard back to the sign-in
screen.

---

## Images

Two paths, deliberately:

**Seeded content** lives in `client/public/img/` — 66 photographs, each encoded
into four variants (1600w and 800w, JPEG and WebP) with `scripts/build-images.mjs`.
Vite copies them verbatim and they inherit a year of immutable cache.

**Uploaded content** goes to `server/uploads/` through `multer` + `sharp`. The
upload buffer never touches disk as-is: `sharp` re-encodes it into the same four
variants, which strips EXIF (including GPS) and rejects anything that is not
actually a decodable image, regardless of its declared MIME type or filename.
Files are named `YYYYMMDD-<uuid8>.jpg` so they are unique and immutably
cacheable. Uploads under 400 × 300 are refused — the layouts are full-bleed.

`<Photo>` renders a `<picture>` with WebP and JPEG `srcset`s, `sizes` derived from
the layout, and a skeleton shimmer until the image decodes. `client/src/lib/images.js`
is the single place that turns a stored URL into the variant set, so the seeded
and the uploaded paths are delivered identically.

Swapping the disk store for S3 or Cloudinary is a change to `storeImage` and
`removeImage` in `server/src/lib/storage.js` only; the rest of the app sees a URL.

---

## Security

- Passwords: bcrypt cost 12, never logged, never returned.
- Login compares against a dummy hash when the account is unknown, so response
  timing does not reveal which addresses exist. Rate limit: 10 failed attempts
  per 15 minutes per IP.
- JWT: HS256, `JWT_SECRET` required at boot and rejected below 32 characters in
  production. Each authenticated request re-reads the admin row, so a deleted
  account loses access immediately rather than at token expiry.
- Helmet: CSP, `frame-ancestors 'self'`, `nosniff`, strict referrer policy.
- CORS: explicit origin allowlist from `CORS_ORIGIN`.
- File uploads: MIME allowlist, 12 MB per file, 8 files per request, re-encoded,
  served from a separate path with `Content-Disposition` untouched only because
  the re-encode already guarantees the bytes.
- `trust proxy` is enabled in production only, so a client cannot spoof
  `X-Forwarded-For` locally to dodge the rate limiter.
- No secrets in the repo. `.env` is git-ignored; `server/.env.example` documents
  every variable.

---

## Accessibility and SEO

Semantic landmarks (`header`/`main`/`nav`/`footer`), one `h1` per page, real
`<label>`s on every field, visible focus rings, keyboard-operable filters and
mobile drawer, `aria-live` on form status, skip-to-content link, and
`prefers-reduced-motion` disables every transition and reveal animation.

`useSeo()` sets the title, description, canonical, Open Graph and Twitter card
per page. `/sitemap.xml` is generated from published projects, `/robots.txt`
keeps `/admin` and `/api` out of crawlers, and `index.html` carries
`ProfessionalService` JSON-LD.

---

## Testing

`npm run test:api` (48 assertions) drives the live API: auth, the full CRUD loop
for projects/services/testimonials, image upload → four files on disk → reorder →
cover → delete, inquiry submission and status transitions, analytics shape, plus
abuse cases — wrong password, missing token, forged token, oversized payload,
bad origin, malformed JSON, unknown route, validation errors, rate limiting — and
deletes everything it created.

What that suite cannot cover is the browser. The checklists in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) list the remaining manual passes for a
new environment, including the 375 / 768 / 1440 responsive layouts.

Verified locally: the production client build, all 48 API assertions, public
contact submission, admin sign-in and rejection, project/service/testimonial CRUD,
gallery upload/reorder/metadata/cover/delete, inquiry workflow, studio publishing,
and password change/restoration. Test records were removed afterwards. The
single-process `npm start` deployment mode still needs verification on the target
host with its production database and persistent upload volume.

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. Two supported shapes:

**One Node process** — `npm run build` then `npm start` serves the API and the
built SPA from a single origin. Requirements: a managed PostgreSQL connection
string and a persistent volume for `server/uploads/`.

**Vercel multi-service** — the root [`vercel.json`](vercel.json) declares a
`client` service (the Vite SPA, catch-all path) and a `server` service (Express,
`/api/*`, `/uploads/*`, `/sitemap.xml`, `/robots.txt`) on one shared origin, so
relative URLs keep working and no CORS or service bindings are needed. Before
the first build succeeds you must set `DATABASE_URL` (managed Postgres — the
embedded dev database cannot deploy), `JWT_SECRET`, `PUBLIC_URL` and
`CORS_ORIGIN` in the Vercel dashboard, then run `migrate:deploy` + `seed`
against that database once. Admin-uploaded images are temporary on Vercel
(`/tmp`, per instance) until storage is pointed at Vercel Blob or S3.
Details and caveats: §11 of [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Credits

Photography is Unsplash stock, licensed and attributed per image in
[docs/IMAGE-LICENSES.md](docs/IMAGE-LICENSES.md). Typeface files come from
`@fontsource/archivo` and `@fontsource/fraunces`. FORMA Studio itself is fictional;
the studio address, clients and inquiries in the seed data are invented.
