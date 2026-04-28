# Backend setup (Supabase + Vercel)

The site has a real backend: Vercel serverless functions in `/api`, talking to a Supabase Postgres database. The Supabase project is **already provisioned** and the schema is **already applied** — this doc is mostly about wiring environment variables into your Vercel project.

## What's already done (provisioned via Supabase MCP)

| Resource | Value |
|---|---|
| Project name | `tramokyo` |
| Project ref / ID | `ixaywzpbmeetokjoreiy` |
| Region | `us-west-1` |
| Project URL | `https://ixaywzpbmeetokjoreiy.supabase.co` |
| Tables | `public.registrations`, `public.programs` |
| Seed | 6 program rows (the originals) |
| RLS | Enabled on both tables, no policies — server-side service-role access only |
| RPC | `public.replace_programs(jsonb)` for atomic program saves |

You don't need to run any SQL by hand.

## What you'll do

1. Grab the **Service Role Key** from Supabase (it can't be fetched via the MCP for security reasons, you have to copy it from the dashboard).
2. Push the repo to GitHub.
3. Import the repo into a new Vercel project.
4. Set four env vars on Vercel.
5. Deploy.

## 1. Grab the Service Role Key

- Open the Supabase dashboard → your `tramokyo` project.
- **Project Settings → API**.
- Copy the **`service_role` key** (long JWT, marked "secret"). This key bypasses RLS — keep it on the server only, never expose it to the browser.
- While you're there, also copy the **Project URL** (`https://ixaywzpbmeetokjoreiy.supabase.co`).

## 2. Import to Vercel

- [vercel.com/new](https://vercel.com/new) → **Add New… → Project**.
- Pick the `Tramokyo` repo.
- **Framework preset**: *Other* (Vercel auto-detects the static `index.html` + the `api/` folder).
- **Root directory**: leave as repo root.
- **Build & Output settings**: defaults — there's no build step.
- Don't deploy yet; do step 3 first.

## 3. Set env vars

Project → **Settings → Environment Variables**. Add four for **Production** + **Preview**:

| Name | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://ixaywzpbmeetokjoreiy.supabase.co` | Public, but stored on the server. |
| `SUPABASE_SERVICE_ROLE_KEY` | _(the key from step 1)_ | **Secret.** Server-only. Bypasses RLS. |
| `ADMIN_PASSWORD` | _your password_ | What you'll type into `/admin.html`. Pick something memorable but non-trivial (12+ chars). |
| `JWT_SECRET` | _random 32+ char string_ | Signs admin session tokens. Easy way: `openssl rand -hex 32`. Rotating this invalidates every outstanding admin session. |

## 4. Deploy

- Project → **Deployments → Redeploy** (or push another commit).
- Once deployed, visit:
  - `https://your-project.vercel.app/` → public site.
  - `https://your-project.vercel.app/admin.html` → admin login.

## 5. Verify

- **Public registration**: submit the form on `/`. Refresh the admin → row appears.
- **Programs**: scroll the public site to the Program section — six cards seeded from the DB.
- **Admin login**: type the password. Wrong password 5×: see *"Locked — wait 60s."* Right password: lands in the registrations table.
- **Edit a cell**: click any text cell, edit, blur. Toast shows *"Saved."*
- **Confirmed pill**: click Pending / Confirmed / Cancelled — value persists across refresh.
- **Programs editor**: add a card, save, refresh public site → the new card shows up within 60s (edge cache TTL).

## How the pieces fit

```
Browser                                 Vercel functions                Supabase Postgres
─────────────────                       ────────────────────            ─────────────────
index.html submit ───POST /api/register──► api/register.js ────INSERT───► registrations
index.html load   ───GET  /api/programs ──► api/programs.js  ────SELECT───► programs

admin.html login  ───POST /api/login    ──► api/login.js     (env: ADMIN_PASSWORD, JWT_SECRET)
admin.html load   ───GET  /api/registrations ──► api/registrations.js ──SELECT─► registrations
admin.html load   ───GET  /api/programs ──► api/programs.js  ────SELECT───► programs
admin.html edit   ─PATCH /api/registrations/:id ──► [id].js  ────UPDATE───► registrations
admin.html save   ───PUT  /api/programs ──► api/programs.js  ──RPC: replace_programs─► programs
```

All Supabase access happens from Vercel functions using the service role key. The browser **never** talks directly to Supabase, so the anon key is never exposed and RLS denies any direct connection.

## Local development

```bash
npm install
vercel link              # pick the imported project
vercel env pull .env.local   # downloads the env vars locally
vercel dev               # runs functions + static on http://localhost:3000
```

If you want to run truly offline (without the API), the public site falls back to the hardcoded programs and the form simulates a successful submit (stays out of users' way for design preview).

## How auth works

- Shared `ADMIN_PASSWORD` env var. Compared in constant time on `/api/login`.
- On success: 12-hour JWT, signed with `JWT_SECRET`, returned in the response body.
- Admin page stores the JWT in `localStorage` and sends it as `Authorization: Bearer <token>` on every admin request.
- 5 failed login attempts in 60s from the same browser → 60-second lockout (per warm function instance — restarting clears it).
- Logging out deletes the token from localStorage. Server-side, you can revoke all outstanding tokens by rotating `JWT_SECRET` and redeploying.

## Rotating secrets

| What | Where | Effect |
|---|---|---|
| `ADMIN_PASSWORD` | Vercel env vars | Old sessions stay valid until JWT expires. Redeploy required. |
| `JWT_SECRET` | Vercel env vars | All sessions invalidated. Everyone re-logs-in. Redeploy required. |
| `SUPABASE_SERVICE_ROLE_KEY` | Rotate in Supabase Dashboard → API, then update in Vercel env vars | All API routes lose DB access until updated; redeploy after both. |

## Adding a new registration field

1. **Supabase**: open SQL editor, run `ALTER TABLE registrations ADD COLUMN ...;`.
2. `lib/db.js`: add the field to `REG_FIELDS` (`['camelCaseKey', 'snake_case_column']`).
3. If admins should edit it, add the camelCase key to `REG_ADMIN_EDITABLE` in `lib/db.js`.
4. If the public form submits it, add the row to the `INSERT` in `insertRegistration`.
5. `admin.html`: add a row to the `REG_FIELDS` array so it appears in the table.
6. `index.html`: add the form input + `name="…"`.

## Project files

```
/api/                       Vercel serverless functions
  register.js               POST — public, insert
  login.js                  POST — password → JWT
  programs.js               GET (public) / PUT (admin)
  registrations.js          GET (admin)
  registrations/[id].js     PATCH (admin)
/lib/                       shared helpers (server-only)
  db.js                     Supabase client + typed helpers
  auth.js                   JWT issue/verify
  http.js                   request/response helpers
/index.html                 public site
/admin.html                 admin dashboard
/assets/                    images
/mockups/                   design exploration (not deployed gameplay)
/package.json               @supabase/supabase-js + jsonwebtoken
/vercel.json                function config
```
