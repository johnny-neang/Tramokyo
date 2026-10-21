# Tramokyo 2026 · Feedback Survey

A standalone, one-question-at-a-time survey page in the Tramokyo brand.
Responses land in a Google Sheet. No database, no build step: plain
HTML + ES modules, deployed as its own Vercel project.

```
survey-site/
  index.html             the whole experience (styles + logic)
  survey-schema.js       every question, option and rule — edit questions here
  config.js              SUBMIT_URL (Google Sheet link) + main-site link
  google-apps-script.gs  paste into the Sheet's Apps Script editor
  assets/                logo + hero illustration
  vercel.json            static hosting headers
```

## 1. Connect the Google Sheet (≈3 minutes)

The responses sheet already exists in Drive:
**Tramokyo 2026 — Feedback Survey Responses**
(https://docs.google.com/spreadsheets/d/1n6NmNwAmWNoKKm7b_yY5iu3esLHqwY4eCuCfrimgoc0/edit)

1. Open the sheet → **Extensions → Apps Script**.
2. Delete what's there, paste all of `google-apps-script.gs`, click **Save**.
3. **Deploy → New deployment** → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the Google permissions prompt, copy the **Web app URL**
   (ends in `/exec`).
5. Paste it into `config.js`:
   ```js
   export const SUBMIT_URL = 'https://script.google.com/macros/s/…/exec';
   ```
6. Commit + push. Vercel redeploys on its own.

Check it: open the `/exec` URL in a browser — it should say `{"ok":true,...}`.
Then submit one test response and watch the row appear.

Until `SUBMIT_URL` is set the page runs in **preview mode**: everything works,
the review screen shows a "Preview mode" note, and nothing is saved.

If you edit the Apps Script later, use **Deploy → Manage deployments → Edit →
New version** so the same URL keeps working.

## 2. Deploy on tramokyo.johnnyneang.com

1. Vercel → **Add New → Project** → import the `Tramokyo` repo again.
2. **Project name**: `tramokyo-survey`. **Root Directory**: `survey-site`.
   Framework preset: **Other**. No build command.
3. Deploy.
4. Project → **Settings → Domains** → add `tramokyo.johnnyneang.com`.
5. At your DNS provider for `johnnyneang.com` (currently Google Cloud DNS /
   Squarespace Domains) add:

   | Type  | Name     | Value                  |
   |-------|----------|------------------------|
   | CNAME | tramokyo | `cname.vercel-dns.com.` |

   Vercel issues the HTTPS certificate once DNS resolves (usually minutes).

## How it behaves

- One question per screen. Single-choice answers advance on their own; on a
  keyboard, `A`–`J` picks an option and `Enter` continues.
- Q17 appears only if a challenge was picked in Q16; Q22 only if Q21 = Yes.
- "No challenges", "Everything was sufficient", "No preference" and "None of
  these dates work" can't be combined with other picks.
- Departure days before the arrival day are crossed out.
- Q18's grid is asked one facility at a time.
- Answers are saved on the device as people go, so closing the tab doesn't
  lose anything. Retries never create duplicate rows (each response has an ID).
- The survey is anonymous unless someone fills in Q1. No IP or device info is
  collected.

## Editing questions

Change `survey-schema.js` only — the page and the sheet columns follow it.
`short` is the column header in the sheet. New columns are added to the sheet
automatically the first time a response includes them.
