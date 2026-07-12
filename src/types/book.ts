/**
 * Domain model for a physical book. This is the single source of truth for
 * the record shape. The Google Sheet columns (backend/Code.gs HEADERS) and
 * the CSV columns (src/lib/columns.ts) mirror this order exactly.
 */

export const BOOK_STATUSES = ['owned', 'wishlist', 'lent', 'lost', 'donated'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const READING_STATUSES = ['unread', 'reading', 'finished', 'abandoned'] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const CONDITIONS = ['new', 'like-new', 'good', 'fair', 'poor'] as const;
export type Condition = (typeof CONDITIONS)[number];

export interface Book {
  /** Immutable UUID, generated on the device that created the record. */
  id: string;
  /** Human catalogue number, e.g. "0042". Suggested automatically, editable. */
  serialNumber: string;
  title: string;
  subtitle: string;
  author: string;
  coAuthors: string;
  translator: string;
  editor: string;
  publisher: string;
  edition: string;
  /** Printing date as printed in the book (free text, e.g. "3rd printing 2019"). */
  printedDate: string;
  publicationYear: number | null;
  isbn10: string;
  isbn13: string;
  language: string;
  category: string;
  subcategory: string;
  priceNpr: number | null;
  /** ISO date (yyyy-mm-dd) or empty string. */
  purchaseDate: string;
  purchaseSource: string;
  room: string;
  shelf: string;
  condition: Condition | '';
  status: BookStatus;
  readingStatus: ReadingStatus;
  pages: number | null;
  notes: string;
  tags: string[];
  /** https URL or a small data:image URL produced by the in-app resizer. */
  coverImageUrl: string;
  /** Payload encoded in the printable QR label. Defaults to the book id. */
  qrCode: string;
  /** Raw scanned barcode (EAN-13 etc.), kept separately from parsed ISBNs. */
  barcode: string;
  borrowedTo: string;
  borrowDate: string;
  returnDate: string;
  favorite: boolean;
  /** ISO timestamps. `updatedAt` drives sync and conflict resolution. */
  createdAt: string;
  updatedAt: string;
  /** Soft delete marker; non-null rows live in the recycle bin. */
  deletedAt: string | null;
}

/** Fields the user edits; system fields are managed by the library service. */
export type BookInput = Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

export function emptyBookInput(): BookInput {
  return {
    serialNumber: '',
    title: '',
    subtitle: '',
    author: '',
    coAuthors: '',
    translator: '',
    editor: '',
    publisher: '',
    edition: '',
    printedDate: '',
    publicationYear: null,
    isbn10: '',
    isbn13: '',
    language: '',
    category: '',
    subcategory: '',
    priceNpr: null,
    purchaseDate: '',
    purchaseSource: '',
    room: '',
    shelf: '',
    condition: '',
    status: 'owned',
    readingStatus: 'unread',
    pages: null,
    notes: '',
    tags: [],
    coverImageUrl: '',
    qrCode: '',
    barcode: '',
    borrowedTo: '',
    borrowDate: '',
    returnDate: '',
    favorite: false,
  };
}

/** Strip system fields for editing/re-saving an existing record. */
export function bookToInput(book: Book): BookInput {
  const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...input } = book;
  return input;
}

export function isDeleted(book: Book): boolean {
  return book.deletedAt !== null && book.deletedAt !== '';
}
