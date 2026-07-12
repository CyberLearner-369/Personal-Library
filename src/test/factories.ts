import { emptyBookInput, type Book } from '@/types/book';

let counter = 0;

/** Deterministic-enough book factory for tests. */
export function makeBook(patch: Partial<Book> = {}): Book {
  counter += 1;
  const day = String((counter % 27) + 1).padStart(2, '0');
  const now = `2026-01-${day}T00:00:00.000Z`;
  return {
    ...emptyBookInput(),
    id: `book-${counter}`,
    title: `Book ${counter}`,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...patch,
  };
}
