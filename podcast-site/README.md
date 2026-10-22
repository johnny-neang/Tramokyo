# TMKO Listening Edition

Password-gated podcast page for Tramokyo: https://tmko.johnnyneang.com
Same brand as the main site (see `../BRAND.md`). It is its own Vercel project, `tmko-podcast`, in the
`johnny-2701s-projects` team next to `tramokyo` and `hunch`, with this folder as the project root.
Deployed from the CLI, not from git.

```
public/          the page (index.html) + assets; the only thing served statically
api/unlock.js    POST {password} sets the cookie, DELETE clears it (the Lock button)
api/episodes.js  episode list + audio URLs, only for browsers holding the cookie
lib/             cookie signing, request helpers
data/            episodes.json: written by the publish script, gitignored (see below)
scripts/         publish-episodes.mjs
```

## How the gate works

The password is checked on the server (`TMKO_PASSWORD`, case and stray spaces ignored). A correct guess
sets a signed, HttpOnly cookie for 30 days (`TMKO_SESSION_SECRET` signs it). The episode list, with the
audio URLs, is only returned to a browser holding that cookie, so the links aren't in the page source.
Five wrong guesses from one address lock it out for a minute (per warm instance, same as the admin login).

It is a shared-password gate, not per-person accounts: the audio files are public Vercel Blob objects
with long random URLs. Anyone who has a direct audio link can play that file without the password, so
treat the password and the links as the same level of secret.

Change the password: edit `TMKO_PASSWORD` in the project's env vars, then `vercel deploy --prod`.
Change `TMKO_SESSION_SECRET` to sign everyone out.

## Audio

The audio is in the `tmko-podcast-audio` Blob store (public, `sfo1`), not in git and not in the
deployment: Vercel caps deployed files at 100 MB and two recordings are bigger. The store is in the
**Sparkle Muffin (Pro)** team on purpose. On the Hobby plan Blob has a hard 10 GB/month transfer cap
and access stops once it is hit, which is about a dozen full listens. On Pro it is metered
($0.05/GB transfer, $0.023/GB-month storage). The site itself needs nothing from that team, because
the audio URLs are public.

`vercel.json` only allows `media-src` from `*.public.blob.vercel-storage.com`.

## Adding or changing episodes

Name the file `TMKO_R13_2026-10-20_Some-Title.m4a`, tag it (title, track, date, album), put it in
`../podcast/`, then:

```bash
node scripts/publish-episodes.mjs    # uploads new files, rewrites data/episodes.json
vercel deploy --prod                 # ships the new manifest
```

Titles, dates and durations come from the m4a tags (ffprobe). The script skips files already uploaded.
It needs the store's read-write token in `.env.blob` (gitignored): `BLOB_READ_WRITE_TOKEN=...`, copied
from the `tmko-podcast-audio` store in the Sparkle Muffin dashboard.

`data/episodes.json` and `../podcast/*.m4a` are gitignored on purpose: the main site's Vercel project
serves the whole repo root as static files, so a committed manifest would expose the audio URLs.
If the manifest is lost, `vercel blob list` (with that token) shows every URL to rebuild it from.

## Domain

`tmko.johnnyneang.com` is a CNAME to `cname.vercel-dns.com` at the DNS host (Google). It verified with
no extra record because `johnnyneang.com` belongs to the `johnny-2701s-projects` team. The Sparkle Muffin
team would have needed a `_vercel` TXT record per subdomain, which is why the project isn't there.

## Run it locally

```bash
vercel env pull .env.local --environment development   # once
vercel dev --listen 3030
```

(`package.json` has no `dev` script on purpose: `vercel dev` refuses to run if it calls itself.)
