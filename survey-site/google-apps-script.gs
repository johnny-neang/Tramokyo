/**
 * Tramokyo 2026 feedback survey → Google Sheet.
 *
 * Paste this into Extensions → Apps Script on the responses spreadsheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access:
 * Anyone). Put the web-app URL in survey-site/config.js.
 *
 * Each submission becomes one row. Column headers are created automatically
 * from the survey, and new columns are added if questions change later.
 */

var SHEET_NAME = 'Responses';
var MAX_CELL = 4000;
var MAX_FIELDS = 80;

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Honeypot field. Real people never fill it in.
    if (body.website) return json_({ ok: true });

    var row = body.row;
    if (!row || typeof row !== 'object') return json_({ ok: false, error: 'bad_payload' });
    var id = String(body.id || '').slice(0, 40);
    if (!/^[A-Za-z0-9-]+$/.test(id)) return json_({ ok: false, error: 'bad_id' });

    var keys = Object.keys(row).slice(0, MAX_FIELDS);
    var record = { 'Response ID': id, 'Submitted': new Date() };
    keys.forEach(function (k) { record[String(k).slice(0, 120)] = row[k]; });

    lock.waitLock(20000);
    var sheet = getSheet_();
    var headers = ensureHeaders_(sheet, Object.keys(record));

    // A retry after a flaky connection shouldn't create a duplicate row.
    if (sheet.getLastRow() > 1) {
      var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === id) return json_({ ok: true, id: id, duplicate: true });
      }
    }

    var values = headers.map(function (h) { return cell_(record[h]); });
    sheet.appendRow(values);
    return json_({ ok: true, id: id });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// Visiting the web-app URL in a browser confirms it's live.
function doGet() {
  return json_({ ok: true, service: 'tramokyo-survey' });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // First run: use the first tab and give it a clear name.
    sheet = ss.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }
  return sheet;
}

function ensureHeaders_(sheet, wanted) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var missing = wanted.filter(function (k) { return headers.indexOf(k) === -1; });
  if (missing.length) {
    headers = headers.concat(missing);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#F2E8D5').setWrap(true);
    sheet.setFrozenRows(1);
  }
  return headers;
}

function cell_(v) {
  if (v instanceof Date) return v;
  if (v == null) return '';
  if (Array.isArray(v)) v = v.join('; ');
  var s = String(v).slice(0, MAX_CELL);
  // Stop free-text answers from being treated as spreadsheet formulas.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
