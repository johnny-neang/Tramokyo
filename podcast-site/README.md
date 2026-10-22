# TMKO Listening Edition

Podcast page for Tramokyo: https://tmko.johnnyneang.com
Same brand as the main site (see `../BRAND.md`). It is its own Vercel project, `tmko-podcast`, in the
`johnny-2701s-projects` team next to `tramokyo` and `hunch`, with this folder as the project root.
Deployed from the CLI, not from git.

```
public/          the page (index.html) + assets; the only thing served statically
api/episodes.js  episode list + audio URLs
lib/             request helpers
data/            episodes.json: written by the publish script, gitignored (see below)
scripts/         publish-episodes.mjs
```

## Access

The page is public: anyone with the link can listen. It stays out of search results (`noindex` meta tag
and `X-Robots-Tag` header). The page fetches the episode list from `/api/episodes`, and the audio files
are public Vercel Blob objects.

Until 2026-10-21 it sat behind a shared password. The `TMKO_PASSWORD` and `TMKO_SESSION_SECRET` env vars
from that time are no longer read.

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
