import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Banknote,
  BookOpen,
  BookPlus,
  FileUp,
  Handshake,
  Library as LibraryIcon,
  ScanLine,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLibrary } from '@/state/LibraryContext';
import { computeStats } from '@/lib/stats';
import { fmtDate, fmtNpr } from '@/lib/format';
import { StatCard } from '@/components/charts/StatCard';
import { Donut } from '@/components/charts/Donut';
import { BarList } from '@/components/charts/BarList';
import { BookCard } from '@/components/books/BookCard';
import { ImportDialog } from '@/components/books/ImportDialog';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SpineMark } from '@/components/books/SpineMark';

export default function Dashboard() {
  const { books, ready } = useLibrary();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const stats = useMemo(() => computeStats(books), [books]);

  if (!ready) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading library">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <>
        <EmptyState
          icon={<LibraryIcon size={40} strokeWidth={1.5} />}
          title="Begin your catalogue"
          description="Every book you own, remembered forever — searchable, safe, and entirely yours. Add the first one, or bring in an existing list."
          action={
            <>
              <Button
                variant="primary"
                icon={<BookPlus size={15} />}
                onClick={() => navigate('/books/new')}
              >
                Add your first book
              </Button>
              <Button
                icon={<ScanLine size={15} />}
                onClick={() => navigate('/books/new?scan=1')}
              >
                Scan an ISBN
              </Button>
              <Button icon={<FileUp size={15} />} onClick={() => setImportOpen(true)}>
                Import CSV
              </Button>
            </>
          }
          className="mt-8"
        />
        <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex animate-fade-in flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Your library</h1>
          <p className="mt-1 text-sm text-muted">
            {stats.totalBooks} book{stats.totalBooks === 1 ? '' : 's'} on the shelves ·{' '}
            {fmtNpr(stats.totalSpent)} invested
          </p>
        </div>
        <Button
          icon={<ScanLine size={15} />}
          onClick={() => navigate('/books/new?scan=1')}
        >
          Scan a new book
        </Button>
      </header>

      {stats.overdueLoans.length > 0 && (
        <div
          role="alert"
          className="rounded-card border border-gilt/40 bg-gilt/10 px-4 py-3 text-sm"
        >
          <p className="font-semibold text-ink">
            <Handshake size={14} className="mr-1.5 inline-block" aria-hidden="true" />
            Lent out for more than a month:
          </p>
          <ul className="mt-1 space-y-0.5 text-muted">
            {stats.overdueLoans.slice(0, 4).map((book) => (
              <li key={book.id}>
                <Link to={`/books/${book.id}`} className="text-accent-ink underline">
                  {book.title}
                </Link>{' '}
                — with {book.borrowedTo || 'someone'} since {fmtDate(book.borrowDate)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section
        aria-label="Library overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Books"
          value={stats.totalBooks}
          sub={`${stats.totalAuthors} authors · ${stats.totalPublishers} publishers`}
          icon={<LibraryIcon size={16} />}
        />
        <StatCard
          label="Money spent"
          value={fmtNpr(stats.totalSpent)}
          sub={stats.averagePrice !== null ? `${fmtNpr(stats.averagePrice)} average` : undefined}
          icon={<Banknote size={16} />}
        />
        <StatCard
          label="Read"
          value={`${stats.read} / ${stats.totalBooks}`}
          sub={`${stats.reading} in progress · ${stats.unread} waiting`}
          icon={<BookOpen size={16} />}
        />
        <StatCard
          label="Wishlist & loans"
          value={stats.wishlist + stats.lent}
          sub={`${stats.wishlist} wished · ${stats.lent} lent out`}
          icon={<Users size={16} />}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="dash-categories" className="card px-5 py-4">
          <h2 id="dash-categories" className="mb-4 font-display text-lg font-semibold">
            Shelves by category
          </h2>
          <Donut items={stats.byCategory} title="Books by category" />
        </section>
        <section aria-labelledby="dash-spend" className="card px-5 py-4">
          <h2 id="dash-spend" className="mb-4 font-display text-lg font-semibold">
            Spending by year
          </h2>
          <BarList
            items={stats.spendByYear}
            format={(item) => fmtNpr(item.amount ?? 0)}
            limit={10}
          />
        </section>
      </div>

      <section aria-labelledby="dash-recent">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="dash-recent" className="font-display text-lg font-semibold">
            Recently added
          </h2>
          <Link to="/books" className="text-sm font-medium text-accent-ink hover:underline">
            All books →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {stats.recentlyAdded.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      {stats.currentlyReading.length > 0 && (
        <section aria-labelledby="dash-reading" className="card px-5 py-4">
          <h2 id="dash-reading" className="mb-3 font-display text-lg font-semibold">
            <Sparkles size={15} className="mr-1.5 inline-block text-accent" aria-hidden="true" />
            Currently reading
          </h2>
          <ul className="divide-y divide-line">
            {stats.currentlyReading.map((book) => (
              <li key={book.id}>
                <Link
                  to={`/books/${book.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-sunken"
                >
                  <SpineMark title={book.title} className="h-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {book.title}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {book.author}
                      {book.pages ? ` · ${book.pages} pages` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.recentPurchases.length > 0 && (
        <section aria-labelledby="dash-purchases" className="card px-5 py-4">
          <h2 id="dash-purchases" className="mb-3 font-display text-lg font-semibold">
            Recent purchases
          </h2>
          <ul className="divide-y divide-line">
            {stats.recentPurchases.map((book) => (
              <li
                key={book.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <Link
                  to={`/books/${book.id}`}
                  className="min-w-0 truncate font-medium text-ink hover:underline"
                >
                  {book.title}
                </Link>
                <span className="shrink-0 text-muted">
                  {fmtDate(book.purchaseDate)}
                  {book.priceNpr !== null && (
                    <span className="ml-3 tabular-nums">{fmtNpr(book.priceNpr)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
