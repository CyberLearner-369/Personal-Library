# Personal Library Manager

A lifelong catalogue of every physical book you own. Offline-first, installable, and
running entirely on infrastructure you already have for free: **GitHub Pages** serves
the app, a **Google Sheet** is the database, and **Google Apps Script** is the backend.
No servers to pay for, no accounts with third parties, no lock-in — your data is a
spreadsheet you can open, a CSV you can download, a JSON file with a checksum.

Add a book by scanning its barcode; the catalogue fills itself in from Google Books or
Open Library. Search as you type across every field. See what you've spent, who you
collect, which shelf a book lives on, and who borrowed what a month ago and still
hasn't returned it.

## Highlights

- **Offline-first** — IndexedDB is the source of truth on each device. Every change is
  queued durably and synced to your Google Sheet when you're online and signed in.
  Close the tab mid-flight; nothing is lost.
- **Data safety in layers** — soft delete with a 30-day recycle bin and undo,
  automatic daily Drive backups with pruning, one-click Drive backup, JSON export with
  a SHA-256 checksum, CSV/Excel export, plus Google Sheets' own version history.
- **Fast at scale** — virtualized table view, debounced instant search with cached
  normalization, code-split exports, lazy images, PWA precaching.
- **Secure by design** — Google Sign-In verified server-side on every request against
  an owner allowlist; all sheet cells written as plain text (formula-injection proof);
  CSV exports neutralize `=+-@` prefixes; cover URLs restricted to `https:`/`data:image`.
- **Accessible** — semantic landmarks, labelled controls, focus-trapped dialogs,
  keyboard shortcuts (`/` search, `n` new book), WCAG-AA contrast in both themes,
  `prefers-reduced-motion` respected.
- **Yours to evolve** — a repository/service layer isolates the UI from Google Sheets
  entirely; swapping in Supabase or Postgres later means re-implementing one small API
  class ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

## Feature map

| Area | What's included |
| --- | --- |
| Catalogue | 38-field records (people, publication, ISBNs, price in NPR, location, condition, tags, cover, lending…), duplicate detection, auto serial numbers |
| Capture | Barcode/ISBN scanning (native `BarcodeDetector`), metadata autofill from Google Books + Open Library, tag & category suggestions, cover upload resized on-device |
| Find | Instant search, 13 filters, 8 sort orders, shareable URLs for every view, grid & table views |
| Insight | Dashboard, statistics: spend by year, top authors/publishers, languages, shelf locations, most expensive, reading progress, overdue loans |
| In & out | CSV import with preview/row-errors/duplicate skipping, CSV/Excel/JSON export, print catalogue (system Save-as-PDF), printable QR spine labels |
| Life | Wishlist, favorites, reading tracker, borrow/return with reminders, recycle bin, dark/light/system theme, installable PWA, works fully offline |

## Quick start

```bash
git clone <your-fork-url> personal-library-manager
cd personal-library-manager
npm install
npm run dev          # http://localhost:5173 — works immediately, local-only
```

The app is fully usable with no configuration (data stays in the browser). To sync
with a Google Sheet and enable Drive backups, follow **[docs/SETUP.md](docs/SETUP.md)**
(~15 minutes, one time), then either paste the two values into **Settings** inside the
app or set them as environment variables / GitHub secrets.

To publish on GitHub Pages, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — push to
`main` and the included workflow lints, tests, builds and deploys.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc --noEmit`) + production build |
| `npm test` / `npm run test:watch` | Vitest unit & integration tests |
| `npm run lint` | ESLint (React, hooks, jsx-a11y), zero warnings allowed |
| `npm run format` | Prettier (with Tailwind class sorting) |

## Configuration

| Variable | Where | Meaning |
| --- | --- | --- |
| `VITE_APPS_SCRIPT_URL` | `.env.local` / GitHub secret / in-app Settings | Apps Script web-app URL ending in `/exec` |
| `VITE_GOOGLE_CLIENT_ID` | `.env.local` / GitHub secret / in-app Settings | OAuth *Web application* client ID |
| `BASE_PATH` | CI only | Pages base path; the workflow derives `/<repo>/` automatically |

In-app Settings values override build-time values, so you never need to rebuild just
to point at a different sheet.

## Project structure

```
backend/            Google Apps Script backend (Code.gs + manifest)
docs/               Setup, deployment, architecture, backup & testing guides
public/icons/       PWA icons + favicon
src/
  types/            Domain model (Book) and API wire types
  lib/              Pure logic: columns, csv, isbn, search, stats, validate…
  db/               Typed IndexedDB wrapper
  data/             LocalStore, SheetsApi, SyncEngine, LibraryService façade
  auth/             Google Identity Services wrapper
  state/            React contexts (auth, library) — read-only data flow
  hooks/            Theme, online, debounce, virtual list, install prompt…
  components/       ui/ primitives · layout/ shell · books/ · charts/
  pages/            Dashboard, Books, Detail, Edit, Statistics, Bin, Settings…
```

## Documentation

- [docs/SETUP.md](docs/SETUP.md) — Google Sheet, Apps Script and OAuth, step by step
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — GitHub Pages via Actions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layers, sync algorithm, security model, decision log, how to swap the database
- [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md) — every safety layer and every recovery path
- [docs/TESTING.md](docs/TESTING.md) — test strategy and how to extend it

## License

MIT — see [LICENSE](LICENSE).
