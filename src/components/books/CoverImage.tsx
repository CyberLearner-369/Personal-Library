import { useEffect, useState } from 'react';
import type { Book } from '@/types/book';
import { spineColor } from '@/lib/spine';
import { cn } from '@/lib/utils';

/**
 * Book cover with a designed fallback: when there is no (or a broken)
 * image, the cover renders as the book's coloured spine with its title —
 * a bookshelf, not a grid of grey boxes.
 */
export function CoverImage({
  book,
  className,
}: {
  book: Pick<Book, 'title' | 'author' | 'coverImageUrl'>;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = book.coverImageUrl;
  useEffect(() => setFailed(false), [url]);

  const usable =
    !failed && (url.startsWith('https://') || url.startsWith('data:image/'));

  if (usable) {
    return (
      <img
        src={url}
        alt={`Cover of ${book.title}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }

  const color = spineColor(book.title);
  return (
    <div
      role="img"
      aria-label={`No cover image for ${book.title}`}
      className={cn(
        'flex h-full w-full flex-col justify-between overflow-hidden p-2.5 text-left',
        className,
      )}
      style={{ background: `linear-gradient(165deg, ${color}, ${color}c9)` }}
    >
      <span className="line-clamp-4 font-display text-[13px] font-semibold leading-snug text-white/95">
        {book.title || 'Untitled'}
      </span>
      <span className="line-clamp-1 text-[10px] uppercase tracking-wide text-white/75">
        {book.author}
      </span>
    </div>
  );
}
