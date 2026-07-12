import type { Book } from '@/types/book';
import { isDeleted } from '@/types/book';

/** Strip diacritics, punctuation and case so "Norwegian Wood!" matches
 *  "norwegian wood". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export interface DuplicateMatch {
  book: Book;
  reason: 'isbn13' | 'isbn10' | 'title-author';
}

/** Find likely duplicates of a candidate among existing books. Deleted
 *  books and the record being edited are excluded. */
export function findDuplicates(
  candidate: Pick<Book, 'isbn10' | 'isbn13' | 'title' | 'author'>,
  books: Book[],
  excludeId?: string,
): DuplicateMatch[] {
  const title = normalizeText(candidate.title);
  const author = normalizeText(candidate.author);
  const matches: DuplicateMatch[] = [];
  for (const book of books) {
    if (book.id === excludeId || isDeleted(book)) continue;
    if (candidate.isbn13 && book.isbn13 === candidate.isbn13) {
      matches.push({ book, reason: 'isbn13' });
    } else if (candidate.isbn10 && book.isbn10 === candidate.isbn10) {
      matches.push({ book, reason: 'isbn10' });
    } else if (
      title &&
      author &&
      normalizeText(book.title) === title &&
      normalizeText(book.author) === author
    ) {
      matches.push({ book, reason: 'title-author' });
    }
  }
  return matches;
}
