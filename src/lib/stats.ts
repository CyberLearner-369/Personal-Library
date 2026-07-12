import type { Book } from '@/types/book';
import { isDeleted } from '@/types/book';
import { purchaseYear } from './search';

export interface CountItem {
  label: string;
  count: number;
  /** Optional secondary metric (e.g. money spent for that group). */
  amount?: number;
}

export interface LibraryStats {
  totalBooks: number;
  totalOwned: number;
  totalAuthors: number;
  totalPublishers: number;
  totalSpent: number;
  averagePrice: number | null;
  totalPages: number;
  read: number;
  reading: number;
  unread: number;
  wishlist: number;
  lent: number;
  favorites: number;
  mostExpensive: Book | null;
  recentlyAdded: Book[];
  recentPurchases: Book[];
  currentlyReading: Book[];
  overdueLoans: Book[];
  byCategory: CountItem[];
  byLanguage: CountItem[];
  byRoom: CountItem[];
  byShelf: CountItem[];
  byAuthor: CountItem[];
  byPublisher: CountItem[];
  spendByYear: CountItem[];
  addedByYear: CountItem[];
  topExpensive: Book[];
}

const LOAN_OVERDUE_DAYS = 30;

function tally(
  books: Book[],
  get: (b: Book) => string,
  amount?: (b: Book) => number,
): CountItem[] {
  const map = new Map<string, CountItem>();
  for (const book of books) {
    const label = get(book).trim() || 'Uncatalogued';
    const item = map.get(label) ?? { label, count: 0, amount: 0 };
    item.count++;
    if (amount) item.amount = (item.amount ?? 0) + amount(book);
    map.set(label, item);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function computeStats(allBooks: Book[]): LibraryStats {
  const books = allBooks.filter((b) => !isDeleted(b));
  const shelfBooks = books.filter((b) => b.status !== 'wishlist');
  const owned = books.filter((b) => b.status === 'owned' || b.status === 'lent');

  const priced = shelfBooks.filter((b) => b.priceNpr !== null);
  const totalSpent = priced.reduce((sum, b) => sum + (b.priceNpr ?? 0), 0);

  const cutoff = Date.now() - LOAN_OVERDUE_DAYS * 86_400_000;

  return {
    totalBooks: shelfBooks.length,
    totalOwned: owned.length,
    totalAuthors: tally(shelfBooks, (b) => b.author).filter(
      (i) => i.label !== 'Uncatalogued',
    ).length,
    totalPublishers: tally(shelfBooks, (b) => b.publisher).filter(
      (i) => i.label !== 'Uncatalogued',
    ).length,
    totalSpent,
    averagePrice: priced.length > 0 ? Math.round(totalSpent / priced.length) : null,
    totalPages: shelfBooks.reduce((sum, b) => sum + (b.pages ?? 0), 0),
    read: shelfBooks.filter((b) => b.readingStatus === 'finished').length,
    reading: shelfBooks.filter((b) => b.readingStatus === 'reading').length,
    unread: shelfBooks.filter((b) => b.readingStatus === 'unread').length,
    wishlist: books.filter((b) => b.status === 'wishlist').length,
    lent: books.filter((b) => b.status === 'lent').length,
    favorites: shelfBooks.filter((b) => b.favorite).length,
    mostExpensive:
      priced.length > 0
        ? priced.reduce((max, b) => ((b.priceNpr ?? 0) > (max.priceNpr ?? 0) ? b : max))
        : null,
    recentlyAdded: [...shelfBooks]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    recentPurchases: shelfBooks
      .filter((b) => b.purchaseDate)
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
      .slice(0, 6),
    currentlyReading: shelfBooks.filter((b) => b.readingStatus === 'reading').slice(0, 6),
    overdueLoans: books.filter(
      (b) =>
        b.status === 'lent' &&
        b.borrowDate &&
        new Date(`${b.borrowDate}T00:00:00`).getTime() < cutoff,
    ),
    byCategory: tally(shelfBooks, (b) => b.category),
    byLanguage: tally(shelfBooks, (b) => b.language),
    byRoom: tally(shelfBooks, (b) => b.room),
    byShelf: tally(
      shelfBooks,
      (b) => [b.room, b.shelf].filter(Boolean).join(' · ') || '',
    ),
    byAuthor: tally(shelfBooks, (b) => b.author, (b) => b.priceNpr ?? 0),
    byPublisher: tally(shelfBooks, (b) => b.publisher, (b) => b.priceNpr ?? 0),
    spendByYear: tally(
      shelfBooks.filter((b) => purchaseYear(b) !== null),
      (b) => String(purchaseYear(b)),
      (b) => b.priceNpr ?? 0,
    ).sort((a, b) => a.label.localeCompare(b.label)),
    addedByYear: tally(shelfBooks, (b) => b.createdAt.slice(0, 4)).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
    topExpensive: [...priced]
      .sort((a, b) => (b.priceNpr ?? 0) - (a.priceNpr ?? 0))
      .slice(0, 10),
  };
}
