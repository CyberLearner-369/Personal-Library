import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLibrary } from '@/state/LibraryContext';
import { applyQuery, queryFromParams } from '@/lib/search';
import { fmtNpr, todayIso } from '@/lib/format';
import { Button } from '@/components/ui/Button';

/**
 * Print-optimised catalogue of the current filtered view. “Export PDF” is
 * this page + the system print dialog (Save as PDF) — dependency-free and
 * pixel-faithful to a real printed catalogue.
 */
export default function PrintList() {
  const { books, ready } = useLibrary();
  const [params] = useSearchParams();
  const printedRef = useRef(false);

  const query = useMemo(() => queryFromParams(params), [params]);
  const results = useMemo(() => {
    const base = query.status ? books : books.filter((b) => b.status !== 'wishlist');
    return applyQuery(base, query);
  }, [books, query]);

  const totalValue = results.reduce((sum, b) => sum + (b.priceNpr ?? 0), 0);

  useEffect(() => {
    if (!ready || printedRef.current) return;
    printedRef.current = true;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-black">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link to={`/books${params.toString() ? `?${params}` : ''}`}>
          <Button>← Back to the app</Button>
        </Link>
        <Button variant="primary" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </div>

      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="font-display text-2xl font-bold">Personal Library — Catalogue</h1>
        <p className="text-sm">
          {todayIso()} · {results.length} book{results.length === 1 ? '' : 's'}
          {totalValue > 0 && <> · total value {fmtNpr(totalValue)}</>}
          {query.q && <> · search “{query.q}”</>}
        </p>
      </header>

      {!ready ? (
        <p>Preparing the catalogue…</p>
      ) : (
        <table className="print-table w-full text-sm">
          <thead>
            <tr>
              <th scope="col">Serial</th>
              <th scope="col">Title & author</th>
              <th scope="col">Publisher</th>
              <th scope="col">Year</th>
              <th scope="col">Location</th>
              <th scope="col">Price</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((book) => (
              <tr key={book.id}>
                <td className="font-mono">{book.serialNumber}</td>
                <td>
                  <strong>{book.title}</strong>
                  {book.author && <> — {book.author}</>}
                </td>
                <td>{book.publisher}</td>
                <td>{book.publicationYear ?? ''}</td>
                <td>{[book.room, book.shelf].filter(Boolean).join(' · ')}</td>
                <td className="text-right">
                  {book.priceNpr !== null ? fmtNpr(book.priceNpr) : ''}
                </td>
                <td>{book.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
