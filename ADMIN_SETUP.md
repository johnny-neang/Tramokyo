# Admin setup

The admin page lives at `/admin.html` and is reachable from a small **secret area** link in the public site footer. Anyone can find it; access is gated by a password you set on the Apps Script side.

## 1. Set the admin password

In your Sheet, open **Extensions → Apps Script**, then:

- Click **⚙ Project Settings** in the left sidebar.
- Scroll to **Script Properties** → **Add script property**.
- **Property**: `ADMIN_PASSWORD`
- **Value**: pick something memorable but non-trivial (~12+ chars)
- **Save script properties**.

That's the only secret. The Apps Script reads it on each `login` request and never returns it.

## 2. Log in

- Visit `/admin.html` (or click the **secret area** link in the public site footer).
- Type the password and submit.
- On success, the admin page caches a 12-hour bearer token in `localStorage` (`tramokyo:admin:token`).
- Subsequent admin actions (cell edits, program saves) are authenticated with that token — the password is never sent again until logout or expiry.

After 5 failed attempts, the script locks out further attempts for 60 seconds. The lockout is per-browser (keyed by `clientId` in localStorage) so your typo lockout doesn't lock everyone else.

## 3. What you can do

- **Registrations**: every column of every row is editable. Click a cell, type, click away. The save lands as soon as the cell loses focus. The three admin-only columns at the right (`Admin Notes`, `Payment Received`, `Confirmed Attendee`) are blank-by-default — `Confirmed Attendee` defaults to `Pending` for new submissions and you can cycle through `Pending / Confirmed / Cancelled`.
- **Programs**: full CRUD on the day-grid. Edit any field (name / kanji / time / location / description / day / sortOrder). Add a new card with **+ Add program**. Delete with the trash button. Drag cards to reorder within a day (sortOrder updates). Hit **Save programs** to write the whole array back. The public site's program page picks up changes within one refresh (server-side cache TTL is 60s).

## 4. Logging out

- Click **Log out** in the admin header. This deletes the token from localStorage and re-prompts for the password.
- Server-side, you can also revoke all tokens by going to Apps Script → **Manage deployments**, edit, deploy a **new version** — that flushes `CacheService` and invalidates outstanding tokens.

## 5. Resetting the password

- Same path as setting it: Apps Script → Project Settings → Script Properties → edit `ADMIN_PASSWORD` → Save.
- Existing tokens stay valid until their TTL expires (or you redeploy as above).

## 6. Debugging

- **"Locked, try again later"**: someone (probably you) failed 5 times in 60s. Wait it out, or redeploy the Apps Script (clears the lockout cache).
- **"Not configured"**: you haven't set `ADMIN_PASSWORD` yet.
- **"Unauthorized"** on a non-login action: token expired or got cleared. The admin page should auto-prompt for re-login when this happens.
- **"Stale"** on a cell save: someone else changed the same cell between your read and your write. Refresh and try again.
- **Apps Script execution log**: Apps Script editor → **Executions** tab. Errors show with stack traces.
- **DevTools → Network** in the admin page: look for the POST to `script.google.com/macros/...`. Response body has the JSON `{ ok, error }` for any failure.

## 7. Notes

- The public site (`index.html`) and the admin (`admin.html`) share the same Apps Script Web App URL. There's only one deployment, one URL, and `SHEET_ENDPOINT` is defined separately in each HTML file — make sure they match if you redeploy with a new URL.
- The Web App URL is published in the page source and is not secret. Treat it as public; protection comes from `ADMIN_PASSWORD`, not from URL obscurity.
- Sheet revision history (**File → Version history**) is your backup of last resort if an admin edit goes wrong.
