# Testing

## What runs today

`npm test` executes Vitest in jsdom with `fake-indexeddb`, covering the layers where
bugs would cost data or correctness:

| Suite | Guards |
| --- | --- |
| `lib/__tests__/isbn` | Checksums (10 & 13, X digit), 10→13 conversion, barcode classification |
| `lib/__tests__/csv` | RFC 4180 edge cases, BOM, formula-injection guard, lossless export→import round trip, per-row error collection, flexible headers |
| `lib/__tests__/duplicates` | Diacritic/case-insensitive matching, ISBN precedence, deleted/self exclusion |
| `lib/__tests__/search` | Token AND-matching, every filter class, null-safe sorting, URL round trip |
| `lib/__tests__/stats` | Shelf vs wishlist vs deleted boundaries, money/pages sums, overdue-loan detection |
| `data/__tests__/localStore` | IndexedDB persistence, queue coalescing, delete-supersedes semantics |
| `data/__tests__/syncEngine` | Conflict adoption (LWW), pull merging, signed-out/unconfigured short-circuits — against an injected fake backend |
| `components/ui/__tests__` | Button semantics & loading, Modal dialog role/Escape/close |

Static layers: `npm run lint` enforces `eslint-plugin-jsx-a11y` (accessibility),
react-hooks rules and zero warnings; `npm run build` runs `tsc --noEmit` in strict
mode. CI runs all three on every push.

## Conventions for new tests

- Pure logic → colocated `__tests__` next to the module; use `src/test/factories.ts`
  (`makeBook`) instead of hand-rolled objects.
- Anything touching IndexedDB just works — `fake-indexeddb/auto` is loaded in
  `src/test/setup.ts`.
- Components: React Testing Library, query by **role and accessible name** only. If a
  test can't find a control that way, the component has an a11y bug — fix the
  component.

## End-to-end tests (optional add-on)

Playwright is not bundled (it downloads browsers), but slots in cleanly:

```bash
npm i -D @playwright/test && npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  webServer: { command: 'npm run dev', url: 'http://localhost:5173' },
  use: { baseURL: 'http://localhost:5173' },
});
```

`e2e/add-book.spec.ts` — the highest-value journey (works offline-only, no Google
needed):

```ts
import { expect, test } from '@playwright/test';

test('add a book and find it again', async ({ page }) => {
  await page.goto('/#/books/new');
  await page.getByLabel('Title *').fill('The Test Book');
  await page.getByLabel('Author').fill('Playwright');
  await page.getByRole('button', { name: 'Add to library' }).click();
  await expect(page.getByRole('heading', { name: 'The Test Book' })).toBeVisible();
  await page.getByLabel('Search your library').fill('test book');
  await page.goto('/#/books?q=test+book');
  await expect(page.getByRole('link', { name: /The Test Book/ })).toBeVisible();
});
```

## Accessibility & performance checks

- Automated: jsx-a11y in lint; optionally add `vitest-axe` for component-level audits.
- Manual release checklist: full keyboard pass (tab order, `/` and `n` shortcuts,
  dialog focus trap & return), screen-reader labels on icon buttons, both themes at
  WCAG AA, `prefers-reduced-motion`.
- Performance: run Lighthouse against the deployed site (PWA + performance
  categories). The precached shell should render from the service worker even with
  the network disabled.
