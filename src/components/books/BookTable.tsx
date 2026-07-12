/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex --
   Rows are fully keyboard-operable (tabIndex + Enter/Space) and each row
   also contains a real link on the title for assistive technology. */
import { useNavigate, Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Book } from '@/types/book';
import { useVirtualList } from '@/hooks/useVirtualList';
import { fmtNpr } from '@/lib/format';
import { SpineMark } from './SpineMark';

const ROW_HEIGHT = 60;
const COLUMNS = 6;

/** Virtualized table view — smooth even with tens of thousands of rows. */
export function BookTable({ books }: { books: Book[] }) {
  const navigate = useNavigate();
  const { containerRef, start, end, padTop, padBottom } = useVirtualList(
    books.length,
    ROW_HEIGHT,
  );
  const slice = books.slice(start, end);

  return (
    <div ref={containerRef} className="card max-h-[72vh] overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_rgb(var(--c-line))]">
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
            <th scope="col" className="px-3 py-2.5 font-semibold">Serial</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Title</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">
              Category
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold lg:table-cell">
              Location
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Price</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {padTop > 0 && (
            <tr aria-hidden="true" style={{ height: padTop }}>
              <td colSpan={COLUMNS} />
            </tr>
          )}
          {slice.map((book) => (
            <tr
              key={book.id}
              tabIndex={0}
              onClick={() => navigate(`/books/${book.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/books/${book.id}`);
                }
              }}
              style={{ height: ROW_HEIGHT }}
              className="cursor-pointer border-t border-line/70 transition-colors first:border-t-0 hover:bg-sunken focus-visible:bg-sunken"
            >
              <td className="px-3 font-mono text-xs text-muted">
                {book.serialNumber || '—'}
              </td>
              <td className="max-w-0 px-3">
                <div className="flex items-center gap-2.5">
                  <SpineMark title={book.title} className="h-8" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      <Link
                        to={`/books/${book.id}`}
                        className="hover:underline"
                        onClick={(event) => event.stopPropagation()}
                        tabIndex={-1}
                      >
                        {book.title}
                      </Link>
                      {book.favorite && (
                        <Star
                          size={12}
                          className="ml-1.5 inline-block text-gilt"
                          fill="currentColor"
                          aria-label="Favorite"
                        />
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">{book.author}</p>
                  </div>
                </div>
              </td>
              <td className="hidden truncate px-3 text-muted md:table-cell">
                {book.category || '—'}
              </td>
              <td className="hidden truncate px-3 text-muted lg:table-cell">
                {[book.room, book.shelf].filter(Boolean).join(' · ') || '—'}
              </td>
              <td className="px-3 text-right tabular-nums text-muted">
                {fmtNpr(book.priceNpr)}
              </td>
              <td className="hidden px-3 capitalize text-muted sm:table-cell">
                {book.status}
              </td>
            </tr>
          ))}
          {padBottom > 0 && (
            <tr aria-hidden="true" style={{ height: padBottom }}>
              <td colSpan={COLUMNS} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
