/**
 * Personal Library Manager — Google Apps Script backend.
 *
 * SETUP (full walkthrough in docs/SETUP.md):
 *   1. Create a Google Sheet, open Extensions → Apps Script, paste this file.
 *   2. Project Settings → Script Properties, add:
 *        GOOGLE_CLIENT_ID  = <your OAuth web client id>
 *        OWNER_EMAILS      = you@gmail.com  (comma-separated for several)
 *   3. Run setup() once (grants permissions, creates sheets).
 *   4. Optionally run installDailyBackup() once for automatic 3 AM backups.
 *   5. Deploy → New deployment → Web app:
 *        Execute as: Me    ·    Who has access: Anyone
 *      Copy the /exec URL into the app's Settings page.
 *
 * SECURITY MODEL: the web app runs as the sheet owner but rejects every
 * request whose Google ID token does not verify against GOOGLE_CLIENT_ID
 * and match OWNER_EMAILS. "Anyone" access only means anyone can *reach*
 * doPost — nobody without your Google session can pass verifyToken_.
 *
 * The client sends JSON as text/plain because Apps Script cannot answer
 * CORS preflight requests; text/plain POSTs are "simple requests" that
 * skip preflight entirely.
 */

/* eslint-disable no-var */

// Column order mirrors src/lib/columns.ts — keep both lists identical.
var HEADERS = [
  'id', 'serialNumber', 'title', 'subtitle', 'author', 'coAuthors',
  'translator', 'editor', 'publisher', 'edition', 'printedDate',
  'publicationYear', 'isbn10', 'isbn13', 'language', 'category',
  'subcategory', 'priceNpr', 'purchaseDate', 'purchaseSource', 'room',
  'shelf', 'condition', 'status', 'readingStatus', 'pages', 'notes', 'tags',
  'coverImageUrl', 'qrCode', 'barcode', 'borrowedTo', 'borrowDate',
  'returnDate', 'favorite', 'createdAt', 'updatedAt', 'deletedAt'
];

var SHEET_BOOKS = 'Books';
var SHEET_LOG = 'Log';
var BACKUP_FOLDER_NAME = 'Personal Library Manager Backups';
var BACKUPS_TO_KEEP = 30;

// ---------------------------------------------------------------- entrypoints

function doGet() {
  return json_({ ok: true, data: { service: 'personal-library-manager', time: nowIso_() } });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Request body is not valid JSON', code: 'bad-request' });
  }
  try {
    var email = verifyToken_(body.idToken);
    var payload = body.payload || {};
    var result;
    switch (body.action) {
      case 'ping':
        result = ping_();
        break;
      case 'pull':
        result = pull_(payload.since || '');
        break;
      case 'push':
        result = push_(payload.mutations || [], email);
        break;
      case 'backupNow':
        result = backupNow_();
        break;
      default:
        return json_({ ok: false, error: 'Unknown action: ' + body.action, code: 'bad-request' });
    }
    return json_({ ok: true, data: result });
  } catch (err) {
    var code = err && err.plmCode ? err.plmCode : 'server';
    return json_({ ok: false, error: String(err && err.message ? err.message : err), code: code });
  }
}

/** Run once from the editor to grant permissions and create the sheets. */
function setup() {
  var sheet = getBooksSheet_();
  getLogSheet_();
  getBackupFolder_();
  Logger.log('Setup complete. "' + sheet.getName() + '" sheet is ready with ' +
    (sheet.getLastRow() - 1) + ' book(s).');
}

// ------------------------------------------------------------------- security

function verifyToken_(idToken) {
  if (!idToken) throw plmError_('Missing Google sign-in token', 'unauthorized');
  var props = PropertiesService.getScriptProperties();
  var clientId = props.getProperty('GOOGLE_CLIENT_ID');
  var owners = String(props.getProperty('OWNER_EMAILS') || '')
    .toLowerCase()
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
  if (!clientId || owners.length === 0) {
    throw plmError_(
      'Backend is not configured: set GOOGLE_CLIENT_ID and OWNER_EMAILS in Script Properties',
      'server'
    );
  }

  // Cache verified tokens briefly so bursts of syncs cost one verification.
  var cache = CacheService.getScriptCache();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken);
  var cacheKey = 'tok_' + Utilities.base64EncodeWebSafe(digest).slice(0, 40);
  var cached = cache.get(cacheKey);
  if (cached) return cached;

  var response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) {
    throw plmError_('Google sign-in expired — sign in again', 'unauthorized');
  }
  var info = JSON.parse(response.getContentText());
  if (info.aud !== clientId) {
    throw plmError_('Sign-in token was issued for a different app', 'unauthorized');
  }
  if (String(info.email_verified) !== 'true') {
    throw plmError_('Google account email is not verified', 'forbidden');
  }
  var email = String(info.email || '').toLowerCase();
  if (owners.indexOf(email) === -1) {
    throw plmError_('This Google account is not allowed to use this library', 'forbidden');
  }
  var ttl = Math.max(60, Math.min(300, Number(info.exp) - Math.floor(Date.now() / 1000) - 30));
  cache.put(cacheKey, email, ttl);
  return email;
}

function plmError_(message, code) {
  var error = new Error(message);
  error.plmCode = code;
  return error;
}

// -------------------------------------------------------------------- actions

function ping_() {
  var sheet = getBooksSheet_();
  return { serverTime: nowIso_(), bookCount: Math.max(0, sheet.getLastRow() - 1) };
}

function pull_(since) {
  var state = readAll_(getBooksSheet_());
  var books = [];
  for (var i = 0; i < state.rows.length; i++) {
    var book = state.rows[i];
    if (!since || String(book.updatedAt) > String(since)) {
      books.push(stripInternal_(book));
    }
  }
  return { books: books, serverTime: nowIso_() };
}

/**
 * Apply a batch of client mutations atomically (script lock + one pass).
 * Conflict rule (mirrors the client): a stored row with a strictly newer
 * updatedAt beats an incoming upsert; the stored row is returned so the
 * client converges on it.
 */
function push_(mutations, email) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getBooksSheet_();
    var state = readAll_(sheet);
    var applied = [];
    var conflicts = [];

    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      var existing = state.byId[mutation.bookId];
      var now = nowIso_();

      if (mutation.type === 'upsert') {
        var incoming = mutation.book;
        if (incoming && incoming.id) {
          if (existing && String(existing.updatedAt) > String(incoming.updatedAt)) {
            conflicts.push(stripInternal_(existing));
          } else {
            writeBook_(sheet, state, incoming, existing ? existing._row : 0);
          }
        }
      } else if (mutation.type === 'delete' || mutation.type === 'restore') {
        if (existing) {
          existing.deletedAt = mutation.type === 'delete' ? now : null;
          existing.updatedAt = now;
          writeBook_(sheet, state, existing, existing._row);
        }
      } else if (mutation.type === 'purge') {
        if (existing) {
          sheet.deleteRow(existing._row);
          shiftRowsAfterDelete_(state, existing._row);
          delete state.byId[mutation.bookId];
        }
      }
      applied.push(mutation.id);
    }

    log_(email, 'push', mutations.length);
    return { applied: applied, conflicts: conflicts, serverTime: nowIso_() };
  } finally {
    lock.releaseLock();
  }
}

function backupNow_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folder = getBackupFolder_();
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH.mm');
  var copy = DriveApp.getFileById(ss.getId()).makeCopy('Library backup ' + stamp, folder);
  pruneBackups_(folder);
  log_('system', 'backup', 1);
  return { fileName: copy.getName() };
}

/** Trigger target — do not rename without re-installing the trigger. */
function dailyBackup() {
  backupNow_();
}

/** Run once from the editor: creates a daily 3–4 AM backup trigger. */
function installDailyBackup() {
  removeBackupTriggers_();
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Daily backup trigger installed (runs between 3 and 4 AM).');
}

function removeBackupTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyBackup') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

// -------------------------------------------------------------- sheet helpers

function getBooksSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKS);
  if (!sheet) sheet = ss.insertSheet(SHEET_BOOKS);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getLogSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOG);
    sheet.getRange(1, 1, 1, 4).setValues([['time', 'account', 'action', 'count']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readAll_(sheet) {
  var lastRow = sheet.getLastRow();
  var rows = [];
  var byId = {};
  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    for (var i = 0; i < values.length; i++) {
      var book = rowToBook_(values[i]);
      if (!book.id) continue;
      book._row = i + 2;
      rows.push(book);
      byId[book.id] = book;
    }
  }
  return { rows: rows, byId: byId };
}

/**
 * Writes are transactional per call: the caller holds the script lock and
 * every cell is forced to plain-text format *before* values land, so user
 * content can never execute as a formula and ISBNs keep leading zeros.
 */
function writeBook_(sheet, state, book, rowIndex) {
  if (!rowIndex) rowIndex = sheet.getLastRow() + 1;
  var range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
  range.setNumberFormat('@');
  range.setValues([bookToRow_(book)]);
  book._row = rowIndex;
  state.byId[book.id] = book;
}

function shiftRowsAfterDelete_(state, deletedRow) {
  for (var id in state.byId) {
    if (state.byId[id]._row > deletedRow) state.byId[id]._row -= 1;
  }
}

function rowToBook_(cells) {
  var book = {};
  for (var i = 0; i < HEADERS.length; i++) {
    book[HEADERS[i]] = cellToValue_(HEADERS[i], cells[i]);
  }
  return book;
}

function cellToValue_(key, raw) {
  var text;
  if (raw === null || raw === undefined) text = '';
  else if (raw instanceof Date) text = raw.toISOString();
  else text = String(raw);

  if (key === 'publicationYear' || key === 'priceNpr' || key === 'pages') {
    if (text === '') return null;
    var n = Number(text);
    return isFinite(n) ? n : null;
  }
  if (key === 'favorite') return /^true$/i.test(text);
  if (key === 'tags') {
    if (text === '') return [];
    return text.split(';').map(function (t) { return t.trim(); }).filter(function (t) { return t.length > 0; });
  }
  if (key === 'deletedAt') return text === '' ? null : text;
  return text;
}

function bookToRow_(book) {
  return HEADERS.map(function (key) {
    var value = book[key];
    if (key === 'tags') return (value || []).join('; ');
    if (key === 'favorite') return value ? 'TRUE' : 'FALSE';
    if (value === null || value === undefined) return '';
    return String(value);
  });
}

function stripInternal_(book) {
  var copy = {};
  for (var key in book) {
    if (key !== '_row') copy[key] = book[key];
  }
  return copy;
}

// --------------------------------------------------------------------- backup

function getBackupFolder_() {
  var folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);
}

function pruneBackups_(folder) {
  var files = folder.getFiles();
  var list = [];
  while (files.hasNext()) {
    var file = files.next();
    list.push({ file: file, created: file.getDateCreated().getTime() });
  }
  list.sort(function (a, b) { return b.created - a.created; });
  for (var i = BACKUPS_TO_KEEP; i < list.length; i++) {
    list[i].file.setTrashed(true);
  }
}

// ---------------------------------------------------------------------- misc

function log_(email, action, count) {
  try {
    getLogSheet_().appendRow([nowIso_(), email, action, count]);
  } catch (err) {
    // Logging must never fail a write.
  }
}

function nowIso_() {
  return new Date().toISOString();
}

function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(
    ContentService.MimeType.JSON
  );
}
