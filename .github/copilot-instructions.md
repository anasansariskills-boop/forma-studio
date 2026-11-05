# Copilot instructions — FORMA Studio

Monorepo (npm workspaces): `client/` = React 19 + Vite SPA, `server/` = Express 5 + Prisma + PostgreSQL.

## Where images live and what uses them

All public-site imagery is served from the **client** service at `/img/...`
(files on disk: `client/public/img/`). Every photo exists in four variants:
`name.jpg` (1600w), `name.webp`, `name-sm.jpg` (800w), `name-sm.webp`.
Never reference `-sm` or `.webp` in code or data — `client/src/lib/images.js`
derives the variant set from the base `.jpg` URL and `<Photo>` renders the
`<picture>`.

| Path | Used by | Stored in |
| --- | --- | --- |
| `img/home/hero.jpg` · `intro.jpg` · `philosophy.jpg` | Home page sections | `StudioProfile.heroImageUrl` / `introImageUrl` / `philosophyImageUrl` (editable from the admin Studio page) |
| `img/projects/<project-slug>/cover.jpg` + `1.jpg … 4.jpg` | Project cards, detail hero + gallery, "more work" rails | `Project.coverImageUrl` and `ProjectImage.url` — seeded by `server/prisma/seed.js` from the slug |
| `img/services/architecture.jpg` · `interior.jpg` · `commercial.jpg` · `renovation.jpg` | Services page cards (one per `discipline`) | `Service.imageUrl` |
| `img/team/ana.jpg` · `rui.jpg` · `marta.jpg` · `tomas.jpg` | About page team grid | `TeamMember.imageUrl` |
| `img/about/atelier.jpg` · `workshop.jpg` | **Hard-coded** in `client/src/pages/About.jsx` and reused by `NotFound.jsx` | nowhere — the only UI-baked images |
| `img/about/portrait.jpg` | About page studio portrait | seeded content |
| `img/contact/studio.jpg` | **Hard-coded** `STUDIO_IMAGE` in `client/src/pages/Contact.jsx` | nowhere |
| `/uploads/YYYYMMDD-<uuid8>.jpg` | Anything an admin uploads (project galleries, studio media) | `ProjectImage.url` etc.; files written to `server/uploads/` by `server/src/lib/storage.js` (ephemeral on Vercel) |

## Rules for any image-related change

- New content imagery goes into `client/public/img/<area>/` and must be run
  through `node scripts/build-images.mjs` to generate the four variants; then
  reference the base `.jpg` path in seed data or via the admin dashboard —
  do not hard-code it into a component.
- Image URLs in the database are always relative (`/img/...` or `/uploads/...`);
  never store absolute hostnames — the same-origin `vercel.json` rewrites make
  relative URLs work locally and on Vercel.
- Admin uploads must stay ≥ 400×300 (enforced server-side) and go through the
  sharp re-encode pipeline; don't bypass `storeImage`.
- Photography is Unsplash stock; credits per image are in
  `docs/IMAGE-LICENSES.md` — keep that file in sync when images change.
