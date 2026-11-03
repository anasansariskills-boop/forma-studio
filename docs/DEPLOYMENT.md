# Deployment

The production shape of this app is deliberately boring: **one Node process**.
`npm run build` compiles the React SPA into `client/dist`, and `npm start` boots
the Express API which also serves that folder as static files and as the SPA
fallback. One origin means no CORS surprises, no second service to keep alive,
and cookies/`Authorization` headers that just work.

```
              ┌───────────────────────────────┐
browser ────▶ │  Express :8787                │
              │  /            → client/dist   │
              │  /uploads/*   → server/uploads│
              │  /api/*       → Prisma ───────┼──▶ PostgreSQL 16
              └───────────────────────────────┘
```

---

## 1. What you need

| | Local development | Production |
| --- | --- | --- |
| Node.js | 20+ | 20+ (LTS) |
| PostgreSQL | embedded in `node_modules` via `scripts/db.mjs` | **a managed or self-hosted server** |
| Image storage | `client/public/img` + `server/uploads` | same, on a persistent volume (or S3 — §6) |
| Secrets | `server/.env` | environment variables in the host's dashboard |

> `embedded-postgres` is a development convenience. It downloads binaries at
> install time and writes to `./.pgdata`, both of which break on most PaaS
> filesystems. In production `DATABASE_URL` must point somewhere else; the
> `db:*` scripts are never invoked by `npm start`.

Any host that runs a persistent Node process and gives you a Postgres connection
will do this — Render, Railway, Fly.io, a Hetzner/Vultr VPS behind nginx, or an
Elastic Beanstalk environment. **This repo has not been deployed to a live host
yet**; the steps below are what that deploy will follow, and the verification
list in §8 is what has to be re-run against the public URL before you can call
it live.

---

## 2. Provision the database

Create an empty PostgreSQL 14+ database and a role that may create tables.

```
postgresql://USER:PASSWORD@HOST:5432/forma?schema=public&sslmode=require
```

Notes that actually bite people:

- **`?schema=public`** — required by Prisma when the connection is pooled through
  PgBouncer-style proxies; keep it.
- **`sslmode=require`** — add it for any managed provider. Without it the
  password travels in clear text.
- Connection pooling: Prisma opens its own pool. On Neon/Supabase, use their
  *transaction-mode* pool URL and set `pool_timeout` accordingly, or the server
  will exhaust the connection limit at boot.

---

## 3. Environment variables

Copy `server/.env.example` to `server/.env` locally; in production set these in
the host's dashboard instead of committing a file.

| Variable | Required | Production value |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` — enables the SPA fallback headers, `trust proxy`, and the strict `JWT_SECRET` check |
| `DATABASE_URL` | yes | managed Postgres, with `sslmode=require` |
| `JWT_SECRET` | yes | ≥ 32 chars or the process refuses to boot. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | no | `8h` default. Shorter is better on shared machines |
| `PUBLIC_URL` | recommended | `https://your-domain.tld` — becomes the origin in `/sitemap.xml`, `/robots.txt`, Open Graph and every uploaded image URL |
| `CORS_ORIGIN` | yes if split | comma-separated allowlist. Same-origin deploy → leave it at the public URL |
| `PORT` | no | the host usually injects this; the app reads it |
| `UPLOAD_DIR` | no | `uploads` (relative to `server/`). Must be a **persistent volume** |
| `MAX_UPLOAD_MB` | no | `12` — raise it if you also raise the reverse proxy's `client_max_body_size` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | only for `npm run seed` | quote the password; dotenv treats an unquoted `#` as a comment |

`server/src/config.js` throws at startup if a required variable is missing, so a
misconfigured deploy fails loudly in the boot log rather than silently 500-ing
on the first request.

---

## 4. Build and run

```bash
npm ci                            # clean install from the lockfile
npm run build                     # → client/dist
npm run migrate:deploy --workspace server  # prisma migrate deploy (NOT migrate dev)
NODE_ENV=production npm start
```

`npm ci` installs dev dependencies too, which pulls the `embedded-postgres`
binaries (~50 MB) that a production server never uses. It costs a slower build
and nothing else, and it keeps `prisma migrate deploy` and `prisma generate`
available in the same step. If you would rather not ship them, run
`npm ci --omit=dev` on the server and apply migrations from your CI pipeline with
`npx prisma@6.19.3 migrate deploy` against the same `DATABASE_URL`.

Add the equivalent of this to the host's process manager:

```yaml
# render.yaml
services:
  - type: web
    name: forma-studio
    runtime: node
    plan: starter
    buildCommand: npm ci && npm run build && npm run migrate:deploy --workspace server
    startCommand: NODE_ENV=production npm start
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        fromDatabase: { name: forma-db, property: connectionString }
      - key: JWT_SECRET
        generateValue: true
      - key: PUBLIC_URL
        value: https://forma-studio.onrender.com
      - key: UPLOAD_DIR
        value: /var/data/uploads
```

`prisma migrate deploy` replays the checked-in SQL in
`server/prisma/migrations/` and records it in `_prisma_migrations`. Never run
`migrate dev` against production data — it can reset a database.

On a VM, keep it alive with systemd:

```ini
# /etc/systemd/system/forma-api.service
[Unit]
Description=FORMA Studio API
After=network.target postgresql.service

[Service]
Type=simple
User=forma
WorkingDirectory=/srv/forma
ExecStart=/usr/bin/node src/index.js
Environment=NODE_ENV=production
Restart=always
RestartSec=3
# Hardening worth having on a box that also runs Postgres
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/srv/forma/server/uploads

[Install]
WantedBy=multi-user.target
```

(Adjust `ExecStart` to `node server/src/index.js` from the repo root, depending on
how you lay out `/srv/forma`.)

---

## 5. Reverse proxy

Terminating TLS and setting the body limit. `trust proxy` is enabled in
production, so `X-Forwarded-For` and `X-Forwarded-Proto` are believed — the
rate limiter and the generated sitemap both depend on that.

```nginx
server {
  listen 443 ssl http2;
  server_name forma-studio.com;

  client_max_body_size 100m;   # 8 × 12 MB uploads plus headroom

  location /uploads/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    # The app already sends immutable cache headers; this just stops nginx
    # re-validating every image on every page view.
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

`Host` matters: with `PUBLIC_URL` unset, `/sitemap.xml` builds its absolute URLs
from it.

---

## 6. Persistent image storage

`server/uploads/` is written at request time. On an ephemeral filesystem (most
PaaS containers) those files vanish on the next deploy, and every admin-uploaded
project image 404s while the database row still points at it.

Three options, in increasing effort:

1. **Attach a volume** and point `UPLOAD_DIR` at it. Nothing else changes.
   This is what the `render.yaml` above does.
2. **Use a managed object store.** Replace the two exported functions in
   `server/src/lib/storage.js` with S3/Cloudinary calls and keep everything else
   — the API returns `{ url, webpUrl, smallUrl, smallWebpUrl, width, height,
   bytes, variants }` and nothing outside that file cares where the bytes live.
   Set `PUBLIC_URL` so the returned URLs are absolute.
3. **Re-seed instead of uploading.** If the studio will never edit imagery
   through the dashboard, `client/public/img` covers all 66 photographs and there
   is nothing to persist.

Whatever you choose, back the uploads folder up alongside the database dump — a
project row whose files are gone is a broken page, not a recoverable one.

---

## 7. Seeding and admin accounts

Production databases do not need the demo seed. If you do run `npm run seed`,
it **truncates and replaces** the content tables. After that:

- Sign in once with the `SEED_ADMIN_*` credentials.
- Change the password from **Account** immediately — that writes a fresh bcrypt
  hash and is the only path to a new one, since there is no signup endpoint.
- Delete or ignore `SEED_ADMIN_PASSWORD` in the host's environment once you are
  in; it is read only by the seed script.

There is no password reset flow (no email service is wired up). If an admin
password is lost, hash a new one and update the row directly:

```bash
node -e "const b=require('bcryptjs');b.hash(process.argv[1],12).then(h=>console.log(h))" 'NewPassword!'
```

```sql
UPDATE admin_users SET "passwordHash" = '<the hash above>' WHERE email = 'studio@forma-studio.com';
```

---

## 8. Post-deploy verification

Run every line; do not sign off on a deploy that skipped one.

**Infrastructure**
- [ ] `GET /api/health` → `{"status":"ok","env":"production","client":true}`. `client:false` means the build output was not found and the SPA will 404.
- [ ] `GET /` serves the HTML app; `GET /projects/any-slug` (a deep link, refreshed cold) also serves it — the SPA fallback works.
- [ ] `GET /api/projects` returns published projects only.
- [ ] `GET /sitemap.xml` lists the domain in `PUBLIC_URL`, not `localhost`.
- [ ] `GET /robots.txt` disallows `/admin` and `/api`.
- [ ] `curl -I` on an `/uploads/...` image: `cache-control: public, max-age=31536000, immutable`.
- [ ] Response headers include `content-security-policy`, `x-content-type-options: nosniff`.

**Public site** — at 1440, 768 and 375 px, on a real device at least once
- [ ] All seven routes render, including a made-up URL (404 page).
- [ ] Every header and footer link navigates. Project cards open their detail page.
- [ ] Project index: filter, search, sort and pagination each change the results *and* the URL; the back button restores state.
- [ ] Contact form: a valid submission shows success and the row exists in the dashboard; a bad email shows the field error; a 9th submit in 15 minutes shows the rate-limit message.
- [ ] No console errors. No 404s in the network tab. Images arrive in WebP on supporting browsers.

**Dashboard**
- [ ] Sign in; wrong password rejected; 11th failed attempt returns 429.
- [ ] Close the tab mid-session and reopen → back at the sign-in screen (`sessionStorage`, not `localStorage`).
- [ ] Create a project with every field, refresh, it is still there. Edit it, delete it.
- [ ] Upload an image → four variants on disk or in the bucket, and it appears on the public site after publish.
- [ ] Reorder the gallery and set a cover; reload; the order held.
- [ ] Service and testimonial CRUD.
- [ ] An inquiry: appears as NEW, open it (becomes READ), move to REPLIED, filter by status, search by email.
- [ ] Analytics numbers move when you add content.
- [ ] Anonymous `GET /api/admin/inquiries` with no token → 401.

**Database**
- [ ] Restart the process; everything you created is still there.
- [ ] `pg_dump` of the production database restores into a scratch database and `npm run dev` against it shows the live content.

---

## 9. Failure modes worth knowing

| Symptom | Cause | Fix |
| --- | --- | --- |
| Boot log: `Missing required environment variable "JWT_SECRET"` | env not set | set it; the check is intentional |
| `JWT_SECRET must be at least 32 characters in production` | short secret | generate a 48-byte one |
| `The database is not reachable` (503 on every DB route) | `DATABASE_URL` wrong, or SSL/allowlist | connect manually with `psql` using the same string |
| Site loads, admin login works, images 404 | uploads lost on redeploy | §6 — you need a volume or object store |
| 413 from nginx on image upload | `client_max_body_size` below `MAX_UPLOAD_MB × 8` | raise the proxy limit |
| Sitemap lists `localhost:8787` | no `PUBLIC_URL`, proxy not forwarding `Host` | set `PUBLIC_URL` or send `Host` |
| `client:false` in `/api/health` | `client/dist` missing at boot | build before start; check the working directory |
| Rate limiters behave oddly after deploys | in-memory store, reset per process | fine for one instance; move to the `redis` store with multiple replicas |

---

## 10. Updating

```bash
git pull
npm ci
npm run build
npm run migrate:deploy --workspace server   # new migrations only
systemctl restart forma-api          # or the host's restart button
```

Take a `pg_dump` before any migration that adds or alters columns. Migrations in
this repo are additive so far, but "additive so far" is exactly the assumption
that costs someone their portfolio page.
