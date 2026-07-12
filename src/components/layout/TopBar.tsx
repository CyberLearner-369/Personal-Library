import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookPlus, Menu as MenuIcon, Search } from 'lucide-react';
import { SyncBadge } from './SyncBadge';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * The single search box for the whole app. On the Books page it filters
 * live (debounced into the URL); anywhere else, submitting jumps to the
 * Books page with the query applied. Press “/” to focus it.
 */
export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const onBooksPage = pathname === '/books';

  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(onBooksPage ? (params.get('q') ?? '') : '');
    // Intentionally keyed on page entry / URL query, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBooksPage, params.get('q')]);

  const debounced = useDebouncedValue(value, 250);
  useEffect(() => {
    if (!onBooksPage) return;
    if ((params.get('q') ?? '') === debounced) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set('q', debounced);
    else next.delete('q');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, onBooksPage]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!onBooksPage) {
      navigate(value ? `/books?q=${encodeURIComponent(value)}` : '/books');
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink lg:hidden"
        >
          <MenuIcon size={20} />
        </button>
        <form role="search" onSubmit={submit} className="min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="global-search" className="sr-only">
            Search your library
          </label>
          <div className="relative">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              id="global-search"
              type="search"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Search title, author, ISBN…"
              autoComplete="off"
              className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-8 text-sm text-ink placeholder:text-faint hover:border-faint"
            />
            <kbd
              aria-hidden="true"
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-sunken px-1.5 font-mono text-[10px] text-faint sm:block"
            >
              /
            </kbd>
          </div>
        </form>
        <div className="ml-auto flex items-center gap-2">
          <SyncBadge />
          <ThemeToggle />
          <Button
            variant="primary"
            size="sm"
            icon={<BookPlus size={15} />}
            onClick={() => navigate('/books/new')}
            className="hidden sm:inline-flex"
          >
            Add book
          </Button>
          <Link
            to="/books/new"
            aria-label="Add book"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent sm:hidden"
          >
            <BookPlus size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
