import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { bookToInput, type Book, type BookStatus } from '@/types/book';
import { library } from '@/data/libraryService';
import { fmtNpr } from '@/lib/format';
import { CoverImage } from './CoverImage';
import { SpineMark } from './SpineMark';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const statusTone: Record<BookStatus, BadgeTone> = {
  owned: 'neutral',
  wishlist: 'accent',
  lent: 'gilt',
  lost: 'danger',
  donated: 'neutral',
};

export function BookCard({ book }: { book: Book }) {
  const toast = useToast();

  const toggleFavorite = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await library.save({ ...bookToInput(book), favorite: !book.favorite }, book);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update', {
        kind: 'error',
      });
    }
  };

  return (
    <Link
      to={`/books/${book.id}`}
      className="card group relative flex flex-col overflow-hidden transition-shadow [content-visibility:auto] [contain-intrinsic-size:0_320px] hover:shadow-lift"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-sunken">
        <CoverImage book={book} />
        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={book.favorite}
          aria-label={
            book.favorite
              ? `Remove ${book.title} from favorites`
              : `Add ${book.title} to favorites`
          }
          className={cn(
            'absolute right-2 top-2 rounded-full bg-surface/85 p-1.5 backdrop-blur transition-opacity',
            book.favorite
              ? 'text-gilt'
              : 'text-muted opacity-0 hover:text-gilt focus-visible:opacity-100 group-hover:opacity-100',
          )}
        >
          <Star size={16} fill={book.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="flex flex-1 gap-2.5 px-3 py-2.5">
        <SpineMark title={book.title} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
            {book.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{book.author || '—'}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {book.status !== 'owned' && (
              <Badge tone={statusTone[book.status]}>{book.status}</Badge>
            )}
            {book.readingStatus === 'reading' && <Badge tone="accent">Reading</Badge>}
            {book.readingStatus === 'finished' && <Badge tone="ok">Read</Badge>}
            {book.priceNpr !== null && (
              <span className="text-xs tabular-nums text-faint">
                {fmtNpr(book.priceNpr)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
