# Backup & restore

“Never lose user data” is enforced in independent layers. Any one of them failing
still leaves several ways back.

## The layers

| # | Layer | Where | How it happens |
| --- | --- | --- | --- |
| 1 | Live local copy | IndexedDB on each device | Automatic on every change; offline changes queue durably |
| 2 | The Google Sheet | Your Drive | Automatic sync whenever online + signed in |
| 3 | Sheet version history | Google Sheets → File → Version history | Automatic, by Google, cell-level |
| 4 | Daily Drive snapshots | Drive folder *Personal Library Manager Backups* | Run `installDailyBackup()` once; newest 30 kept |
| 5 | On-demand Drive snapshot | Same folder | Settings → **Back up to Drive now** |
| 6 | JSON backup with checksum | A file you keep anywhere | Settings → **Download JSON backup** (includes recycle bin; SHA-256 verified on restore) |
| 7 | CSV / Excel export | A file you keep anywhere | Books page → Export, or Settings |

Deletion is also soft by default: deleted books sit in the **recycle bin for 30 days**
with one-click restore (and an Undo toast the moment you delete).

## Recovery recipes

**“I deleted a book by mistake.”**
Recycle bin → Restore. Within the first seconds, the Undo action on the toast does the
same.

**“I mangled a field / pasted over rows in the sheet.”**
Google Sheets → File → **Version history** → restore the version from before the
mistake, then in the app: Settings → **Re-download from sheet**.

**“My laptop died / I got a new phone.”**
Open the app on the new device, enter the connection in Settings, sign in — the whole
library downloads. Nothing to restore.

**“The sheet itself is gone or ruined.”**
Open the newest file in *Personal Library Manager Backups* (it is a full spreadsheet
copy). Either continue using that copy — open its Apps Script, redeploy, update the
URL in Settings — or copy its `Books` tab contents back into the original sheet, then
**Re-download from sheet**.

**“I only have a JSON backup.”**
Settings → **Restore JSON backup**. The file's checksum is verified, books are merged
in (same ID = overwrite), and the next sync pushes everything to the sheet.

**“I want out entirely.”**
Export CSV or Excel — every field, openable anywhere, forever. The sheet itself is
also already yours.

## Habits worth keeping

- Run `installDailyBackup()` (once) — layer 4 is the one that saves you from slow-burn
  mistakes you notice a week later.
- Download a JSON backup before big imports or bulk edits.
- The recycle bin purges after 30 days; “Empty bin” and “Delete forever” are the only
  truly destructive actions in the app, and both double-confirm.
