# Registration → Google Sheet setup

Five minutes. No backend, no hosting, free forever.

## 1. Prep the Sheet

- Open the Sheet you want submissions to land in.
- Put this header row in row 1 so the columns align with what the form sends:

```
Submitted At | First Name | Last Name | Pronouns | Email | Phone | Experience Name | Schedule | Build Sign | Fee Acknowledged | Pets | Container Room | Sandman | Ranger/Medical | Art Grant | Sponsor | Notes | Liability Agreed
```

## 2. Add the Apps Script

In the Sheet, open **Extensions → Apps Script**. Delete the starter code and paste this in:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const d = JSON.parse(e.postData.contents);
  sheet.appendRow([
    d.submittedAt || new Date(),
    d.firstName, d.lastName, d.pronouns, d.email, d.phone,
    d.experienceName, d.schedule,
    d.buildSign ? 'YES' : 'NO',
    d.feeAck ? 'YES' : 'NO',
    d.pets, d.containerRoom, d.sandman,
    d.ranger, d.artGrant,
    d.sponsor, d.notes,
    d.liabilityAck ? 'YES' : 'NO'
  ]);
  return ContentService.createTextOutput(JSON.stringify({ok: true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy as a Web App

- **Deploy → New deployment → Type: Web app**.
- Execute as: **Me**.
- Who has access: **Anyone**.
- Click **Deploy**, grant permissions when prompted, copy the Web App URL it hands back.

## 4. Paste the URL into the site

Open `index.html` (in the repo root) and find:

```javascript
const SHEET_ENDPOINT = '';
```

Paste the URL inside the quotes:

```javascript
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycby.../exec';
```

## 5. Test it

Submit the form. A new row should appear in the Sheet within a second or two. If it doesn't:

- Open DevTools → Console; the browser logs the payload when `SHEET_ENDPOINT` is empty.
- Check Apps Script → **Executions** tab for error logs.
- If you changed the script, redeploy (**Manage deployments → edit → new version**) — existing URL stays the same.

## Notes

- The client uses `mode: 'no-cors'` so the browser can't read the response body. That's fine — Apps Script still gets the POST and writes the row.
- Adding new fields later: add a column in the Sheet, add an `appendRow` entry in the script, redeploy.
- If you change the Sheet name, the script above uses the first sheet by index, so it'll keep working regardless.
