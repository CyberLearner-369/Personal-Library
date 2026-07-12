import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookPlus, FileUp, LayoutGrid, ListFilter, Rows3, X } from 'lucide-react';
import { useLibrary } from '@/state/LibraryContext';
import {
  applyQuery,
  countActiveFilters,
  emptyQuery,
  queryFromParams,
  queryToParams,
  SORT_OPTIONS,
  type BookQuery,
  type SortKey,
} from '@/lib/search';
import { fmtNpr } from '@/lib/format';
import { BookCard } from '@/components/books/BookCard';
import { BookTable } from '@/components/books/BookTable';
import { BookFilters } from '@/components/books/BookFilters';
import { ImportDialog } from '@/components/books/ImportDialog';
import { ExportMenu } from '@/components/books/ExportMenu';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'table';
const VIEW_KEY = 'plm.view';

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}

export default function Books() {
  const { books, ready } = useLibrary();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<ViewMode>(readViewMode);

  const query = useMemo(() => queryFromParams(params), [params]);

  // The plain “Books” view is the physical shelf; wishlist items appear
  // only when explicitly filtered for (sidebar → Wishlist).
  const base = useMemo(
    () => (query.status ? books : books.filter((b) => b.status !== 'wishlist')),
    [books, query.status],
  );
  const results = useMemo(() => applyQuery(base, query), [base, query]);

  const totalValue = useMemo(
    () => results.reduce((sum, b) => sum + (b.priceNpr ?? 0), 0),
    [results],
  );

  const applyNewQuery = (next: BookQuery) => {
    setParams(queryToParams(next));
    setFiltersOpen(false);
  };

  const setViewMode = (mode: ViewMode) => {
    setView(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* private browsing */
    }
  };

  const title =
    query.status === 'wishlist'
      ? 'Wishlist'
      : query.status === 'lent'
        ? 'Lent out'
        : query.favorite
          ? 'Favorites'
          : 'Books';

  const chips = useMemo(() => {
    const list: Array<{ label: string; clear: () => void }> = [];
    const drop = (patch: Partial<BookQuery>) => () =>
      applyNewQuery({ ...query, ...patch });
    if (query.q) list.push({ label: `“${query.q}”`, clear: drop({ q: '' }) });
    if (query.status) list.push({ label: query.status, clear: drop({ status: '' }) });
    if (query.readingStatus)
      list.push({ label: query.readingStatus, clear: drop({ readingStatus: '' }) });
    if (query.condition)
      list.push({ label: query.condition, clear: drop({ condition: '' }) });
    if (query.author) list.push({ label: query.author, clear: drop({ author: '' }) });
    if (query.publisher)
      list.push({ label: query.publisher, clear: drop({ publisher: '' }) });
    if (query.language)
      list.push({ label: query.language, clear: drop({ language: '' }) });
    if (query.category)
      list.push({ label: query.category, clear: drop({ category: '' }) });
    if (query.room) list.push({ label: query.room, clear: drop({ room: '' }) });
    if (query.shelf) list.push({ label: query.shelf, clear: drop({ shelf: '' }) });
    if (query.tag) list.push({ label: `#${query.tag}`, clear: drop({ tag: '' }) });
    if (query.favorite) list.push({ label: 'favorites', clear: drop({ favorite: false }) });
    if (query.yearFrom !== null || query.yearTo !== null)
      list.push({
        label: `bought ${query.yearFrom ?? '…'}–${query.yearTo ?? '…'}`,
        clear: drop({ yearFrom: null, yearTo: null }),
      });
    if (query.priceMin !== null || query.priceMax !== null)
      list.push({
        label: `Rs ${query.priceMin ?? 0}–${query.priceMax ?? '…'}`,
        clear: drop({ priceMin: null, priceMax: null }),
      });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!ready) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading books">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            {results.length} book{results.length === 1 ? '' : 's'}
            {totalValue > 0 && <> · {fmtNpr(totalValue)}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={<FileUp size={15} />} onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <ExportMenu books={results} printSearch={params.toString()} />
          <Button
            variant="primary"
            icon={<BookPlus size={15} />}
            onClick={() => navigate('/books/new')}
          >
            Add book
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          icon={<ListFilter size={15} />}
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
        >
          Filters
          {countActiveFilters(query) > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-on-accent">
              {countActiveFilters(query)}
            </span>
          )}
        </Button>
        <Select
          label="Sort books"
          labelHidden
          value={query.sort}
          onChange={(event) =>
            applyNewQuery({ ...query, sort: event.target.value as SortKey })
          }
          className="w-52"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div
          role="group"
          aria-label="View mode"
          className="ml-auto flex overflow-hidden rounded-lg border border-line"
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-pressed={view === 'grid'}
            aria-label="Grid view"
            className={cn(
              'flex h-9 w-10 items-center justify-center transition-colors',
              view === 'grid' ? 'bg-accent-soft text-accent-ink' : 'bg-surface text-muted hover:bg-sunken',
            )}
          >
            <LayoutGrid size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={view === 'table'}
            aria-label="Table view"
            className={cn(
              'flex h-9 w-10 items-center justify-center border-l border-line transition-colors',
              view === 'table' ? 'bg-accent-soft text-accent-ink' : 'bg-surface text-muted hover:bg-sunken',
            )}
          >
            <Rows3 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.label}>
              <button
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink transition-colors hover:bg-accent hover:text-on-accent"
              >
                {chip.label}
                <X size={11} aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => applyNewQuery({ ...emptyQuery(), sort: query.sort })}
              className="px-2 py-1 text-xs font-medium text-muted underline hover:text-ink"
            >
              Clear all
            </button>
          </li>
        </ul>
      )}

      {results.length === 0 ? (
        <EmptyState
          title={chips.length > 0 ? 'No books match' : 'Nothing here yet'}
          description={
            chips.length > 0
              ? 'Try loosening the search or clearing a filter.'
              : 'Add a book and it will appear on this shelf.'
          }
          action={
            chips.length > 0 ? (
              <Button onClick={() => applyNewQuery({ ...emptyQuery(), sort: query.sort })}>
                Clear filters
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<BookPlus size={15} />}
                onClick={() => navigate('/books/new')}
              >
                Add a book
              </Button>
            )
          }
        />
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((book) => (
            <li key={book.id}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      ) : (
        <BookTable books={results} />
      )}

      <BookFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        query={query}
        onApply={applyNewQuery}
      />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
