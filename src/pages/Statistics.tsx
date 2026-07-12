import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLibrary } from '@/state/LibraryContext';
import { computeStats } from '@/lib/stats';
import { fmtNpr } from '@/lib/format';
import { StatCard } from '@/components/charts/StatCard';
import { BarList } from '@/components/charts/BarList';
import { Donut } from '@/components/charts/Donut';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { SpineMark } from '@/components/books/SpineMark';

function Panel({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="card px-5 py-4">
      <h2 id={id} className="mb-4 font-display text-lg font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Statistics() {
  const { books, ready } = useLibrary();
  const navigate = useNavigate();
  const stats = useMemo(() => computeStats(books), [books]);

  if (!ready) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (stats.totalBooks === 0) {
    return (
      <EmptyState
        title="No statistics yet"
        description="Charts appear as soon as your first books are catalogued."
      />
    );
  }

  return (
    <div className="flex animate-fade-in flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Statistics</h1>
        <p className="mt-1 text-sm text-muted">
          The shape of your collection — {stats.totalBooks} books.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total invested" value={fmtNpr(stats.totalSpent)} />
        <StatCard
          label="Average price"
          value={stats.averagePrice !== null ? fmtNpr(stats.averagePrice) : '—'}
        />
        <StatCard label="Total pages" value={stats.totalPages.toLocaleString('en-IN')} />
        <StatCard
          label="Most expensive"
          value={stats.mostExpensive ? fmtNpr(stats.mostExpensive.priceNpr) : '—'}
          sub={stats.mostExpensive?.title}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel id="stats-authors" title="Most collected authors">
          <BarList
            items={stats.byAuthor.filter((i) => i.label !== 'Uncatalogued')}
            limit={10}
            onSelect={(author) => navigate(`/books?author=${encodeURIComponent(author)}`)}
          />
        </Panel>
        <Panel id="stats-publishers" title="Publishers">
          <BarList
            items={stats.byPublisher.filter((i) => i.label !== 'Uncatalogued')}
            limit={10}
            format={(item) => `${item.count} · ${fmtNpr(item.amount ?? 0)}`}
            onSelect={(publisher) =>
              navigate(`/books?publisher=${encodeURIComponent(publisher)}`)
            }
          />
        </Panel>
        <Panel id="stats-languages" title="Languages">
          <Donut items={stats.byLanguage} title="Books by language" />
        </Panel>
        <Panel id="stats-rooms" title="Where books live">
          <BarList
            items={stats.byShelf.filter((i) => i.label !== 'Uncatalogued')}
            limit={10}
            onSelect={(place) => {
              const [room] = place.split(' · ');
              navigate(`/books?room=${encodeURIComponent(room)}`);
            }}
          />
        </Panel>
        <Panel id="stats-spend" title="Spending by year">
          <BarList
            items={stats.spendByYear}
            limit={12}
            format={(item) => fmtNpr(item.amount ?? 0)}
          />
        </Panel>
        <Panel id="stats-growth" title="Books added per year">
          <BarList items={stats.addedByYear} limit={12} />
        </Panel>
      </div>

      <Panel id="stats-expensive" title="Ten most expensive">
        <ol className="divide-y divide-line/70">
          {stats.topExpensive.map((book, index) => (
            <li key={book.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-5 shrink-0 text-right font-mono text-xs text-faint">
                {index + 1}
              </span>
              <SpineMark title={book.title} className="h-6" />
              <Link
                to={`/books/${book.id}`}
                className="min-w-0 flex-1 truncate font-medium text-ink hover:underline"
              >
                {book.title}
              </Link>
              <span className="shrink-0 tabular-nums text-muted">
                {fmtNpr(book.priceNpr)}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
