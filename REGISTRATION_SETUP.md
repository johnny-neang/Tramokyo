# Registration → Google Sheet setup

Five minutes. No backend, no hosting, free forever. The same Apps Script Web App URL powers the public registration form **and** the admin page (`admin.html`).

> If you've already set up an earlier version of this script: replace the entire `Code.gs` with the version below, then **Manage deployments → edit → New version → Deploy**. The Web App URL stays the same.

## 1. Prep the Sheet

Open the Sheet you want submissions to land in, then create / verify the two tabs:

### Tab 1 — `Registrations`

Put this header row in row 1:

```
Submitted At | First Name | Last Name | Pronouns | Email | Phone | Experience Name | Schedule | Build Sign | Fee Acknowledged | Pets | Container Room | Sandman | Ranger/Medical | Art Grant | Sponsor | Notes | Liability Agreed | Admin Notes | Payment Received | Confirmed Attendee
```

The first 18 columns are filled by the public form; the last three (`Admin Notes`, `Payment Received`, `Confirmed Attendee`) are admin-only and start blank — `Confirmed Attendee` is auto-set to `Pending` on each new registration.

### Tab 2 — `Programs`

Put this header row in row 1:

```
id | day | name | jp | desc | time | location | sortOrder
```

Then seed it with the six current entries (or any others — the public site will fetch from this tab):

```
walk    | 15 | Morning Walk    | 朝歩き  | Four miles before sunrise. Coffee at the ridge. Back in time for miso. | 05:30 | Tokyo (Center Camp) | 1
onsen   | 15 | Hot Spring      | 温泉   | A steaming rock basin twenty minutes up the path. Cedar walls, no phones. | 10:00 | Fukushima | 2
robata  | 16 | Fireside Supper | 炉端   | Cast iron on coals. One long table. Potluck — bring something with a story. | 18:00 | Tokyo (Center Camp) | 1
tea     | 17 | Dawn Tea        | 朝茶   | Silent tea service at first light. Folded tatami, quiet hands, warm cups. | 06:00 | Wakayama | 1
fish    | 17 | Night Fishing   | 夜釣り  | Headlamps, hand lines, the stream. Release everything. Sashimi is not on the plan. | 22:00 | Niigata | 2
stars   | 18 | Starlight Walk  | 星空   | No flashlights. Fifteen minutes down the old road. Eyes adjust. Mostly you listen. | 23:00 | Toyama | 1
```

## 2. Set the admin password

In the Sheet, open **Extensions → Apps Script**.

Open **Project Settings (⚙ in the left sidebar) → Script Properties → Add script property**:

| Property | Value |
|---|---|
| `ADMIN_PASSWORD` | _whatever you like — pick something memorable but non-trivial_ |

Save. This is the only secret. The Web App URL itself is public (it's in the published JS).

## 3. Paste the Apps Script

Back in the Apps Script editor, replace the contents of `Code.gs` with this:

```javascript
// ============ Tramokyo registration + admin Web App ============
const REG_SHEET = 'Registrations';
const PROG_SHEET = 'Programs';
const TOKEN_TTL_SEC = 12 * 60 * 60;       // 12h sessions
const LOCKOUT_TTL_SEC = 60;               // failed-login lockout
const LOCKOUT_THRESHOLD = 5;
const PROGRAMS_CACHE_TTL_SEC = 60;        // public GET cache

// ---- entry points ----
function doGet(e) {
  return json_(handleProgramsGet_());
}

function doPost(e) {
  let d = {};
  try { d = JSON.parse(e.postData.contents || '{}'); } catch (_) {}
  const action = d.action || 'register';
  try {
    if (action === 'register') return json_(handleRegister_(d));
    if (action === 'login')    return json_(handleLogin_(d));
    requireToken_(d.token);
    if (action === 'list')                return json_(handleList_());
    if (action === 'updateRegistration')  return json_(handleUpdateRegistration_(d));
    if (action === 'updatePrograms')      return json_(handleUpdatePrograms_(d));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

// ---- registration (public) ----
function handleRegister_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sheet = sheet_(REG_SHEET);
    const headers = headers_(sheet);
    const map = {
      'Submitted At':       d.submittedAt || new Date(),
      'First Name':         d.firstName,
      'Last Name':          d.lastName,
      'Pronouns':           d.pronouns,
      'Email':              d.email,
      'Phone':              d.phone,
      'Experience Name':    d.experienceName,
      'Schedule':           d.schedule,
      'Build Sign':         d.buildSign ? 'YES' : 'NO',
      'Fee Acknowledged':   d.feeAck ? 'YES' : 'NO',
      'Pets':               d.pets,
      'Container Room':     d.containerRoom,
      'Sandman':            d.sandman,
      'Ranger/Medical':     d.ranger,
      'Art Grant':          d.artGrant,
      'Sponsor':            d.sponsor,
      'Notes':              d.notes,
      'Liability Agreed':   d.liabilityAck ? 'YES' : 'NO',
      'Confirmed Attendee': 'Pending'
    };
    const row = headers.map(h => map[h] !== undefined ? map[h] : '');
    sheet.appendRow(row);
    invalidateProgramsCache_(); // safe no-op if not cached
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// ---- programs GET (public, cached 60s) ----
function handleProgramsGet_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('programs');
  if (cached) return JSON.parse(cached);
  const data = readPrograms_();
  const payload = { ok: true, programs: data };
  cache.put('programs', JSON.stringify(payload), PROGRAMS_CACHE_TTL_SEC);
  return payload;
}

function invalidateProgramsCache_() {
  CacheService.getScriptCache().remove('programs');
}

function readPrograms_() {
  const sheet = sheet_(PROG_SHEET);
  const headers = headers_(sheet);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const rows = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  return rows.map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i]; });
    // normalise types
    if (o.day !== '' && o.day !== null) o.day = Number(o.day);
    if (o.sortOrder !== '' && o.sortOrder !== null) o.sortOrder = Number(o.sortOrder);
    return o;
  }).sort((a, b) =>
    (a.day - b.day) || ((a.sortOrder || 0) - (b.sortOrder || 0))
  );
}

// ---- login (public, password) ----
function handleLogin_(d) {
  const cache = CacheService.getScriptCache();
  const lockKey = 'lock:' + (d.clientId || 'global');
  if (cache.get(lockKey)) return { ok: false, error: 'locked' };

  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!expected) return { ok: false, error: 'not_configured' };

  if (String(d.password || '') !== expected) {
    const failKey = 'fail:' + (d.clientId || 'global');
    const fails = Number(cache.get(failKey) || 0) + 1;
    if (fails >= LOCKOUT_THRESHOLD) {
      cache.put(lockKey, '1', LOCKOUT_TTL_SEC);
      cache.remove(failKey);
      return { ok: false, error: 'locked' };
    }
    cache.put(failKey, String(fails), LOCKOUT_TTL_SEC);
    return { ok: false, error: 'invalid' };
  }

  const token = randomToken_();
  cache.put('token:' + token, '1', TOKEN_TTL_SEC);
  return { ok: true, token, expiresAt: Date.now() + TOKEN_TTL_SEC * 1000 };
}

function requireToken_(token) {
  if (!token) throw new Error('unauthorized');
  const ok = CacheService.getScriptCache().get('token:' + token);
  if (!ok) throw new Error('unauthorized');
}

function randomToken_() {
  const bytes = [];
  for (let i = 0; i < 32; i++) bytes.push(Math.floor(Math.random() * 256));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---- list (admin) ----
function handleList_() {
  const reg = sheet_(REG_SHEET);
  const regHeaders = headers_(reg);
  const last = reg.getLastRow();
  let registrations = [];
  if (last >= 2) {
    const values = reg.getRange(2, 1, last - 1, regHeaders.length).getValues();
    registrations = values.map((r, idx) => {
      const o = { rowIndex: idx + 2 };
      regHeaders.forEach((h, i) => { o[h] = r[i]; });
      return o;
    });
  }
  return {
    ok: true,
    headers: regHeaders,
    registrations,
    programs: readPrograms_()
  };
}

// ---- updateRegistration (admin) ----
function handleUpdateRegistration_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sheet = sheet_(REG_SHEET);
    const headers = headers_(sheet);
    const colIdx = headers.indexOf(d.field);
    if (colIdx < 0) throw new Error('unknown_field');
    if (!d.rowIndex || d.rowIndex < 2) throw new Error('bad_row');
    const cell = sheet.getRange(d.rowIndex, colIdx + 1);
    if (d.expectedOldValue !== undefined && d.expectedOldValue !== null) {
      const cur = cell.getValue();
      const same = String(cur) === String(d.expectedOldValue);
      if (!same) throw new Error('stale');
    }
    cell.setValue(d.value === undefined ? '' : d.value);
    return { ok: true, value: d.value };
  } finally {
    lock.releaseLock();
  }
}

// ---- updatePrograms (admin) ----
function handleUpdatePrograms_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sheet = sheet_(PROG_SHEET);
    const headers = headers_(sheet);
    const last = sheet.getLastRow();
    if (last >= 2) sheet.getRange(2, 1, last - 1, headers.length).clearContent();
    const programs = Array.isArray(d.programs) ? d.programs : [];
    if (!programs.length) {
      invalidateProgramsCache_();
      return { ok: true, count: 0 };
    }
    const rows = programs.map(p => headers.map(h => p[h] !== undefined ? p[h] : ''));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    invalidateProgramsCache_();
    return { ok: true, count: rows.length };
  } finally {
    lock.releaseLock();
  }
}

// ---- helpers ----
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName(name);
  if (!s) throw new Error('missing_sheet:' + name);
  return s;
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).trim());
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 4. Deploy as a Web App

- **Deploy → New deployment → Type: Web app**.
- Description: anything you like (e.g. `tramokyo v2`).
- **Execute as: Me**.
- **Who has access: Anyone**.
- Click **Deploy**, grant permissions when prompted, copy the Web App URL it hands back.

If you're updating an existing deployment instead: **Manage deployments → ✏ Edit → Version: New version → Deploy**. The URL stays the same.

## 5. Paste the URL into the site

Open `index.html` (in the repo root) and find:

```javascript
const SHEET_ENDPOINT = '';
```

Paste the URL inside the quotes:

```javascript
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycby.../exec';
```

Open `admin.html` and do the same — both files share the constant, but they're separate copies.

## 6. Test it

- **Public**: submit the form. A row appears in `Registrations` within a second; `Confirmed Attendee` reads `Pending`.
- **Public**: reload `index.html`. The Program page renders cards from the `Programs` tab (changes propagate within ~60s thanks to the server-side cache).
- **Admin**: visit `admin.html`, log in. See registrations + programs. Edit a cell — refresh the Sheet in another tab, the value matches.

## Notes

- The public form uses `mode: 'cors'` (default) with `Content-Type: text/plain` so it can read the response body and surface real errors. Apps Script "Anyone" deployments allow this.
- Adding new fields later: add a column header in `Registrations`, add a line to the `map` object in `handleRegister_`, redeploy. Header lookup means column order doesn't matter.
- The 60-second cache on `doGet` (`programs`) is invalidated automatically on any registration or programs update, so admin edits show up to the public site within a refresh.
- Tokens, lockouts, and cached payloads are kept in `CacheService` (in-memory, ephemeral) — restarts of Apps Script will boot everyone.
- See `ADMIN_SETUP.md` for the password / debugging story.
