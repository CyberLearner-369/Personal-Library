import type { Book } from '@/types/book';

/**
 * One column definition per Book field, in canonical order. This drives CSV
 * and Excel export, CSV import header matching, and the printable list.
 * The Google Sheet uses the `key` values as its header row (see
 * backend/Code.gs HEADERS — keep both lists in the same order).
 */
export interface ColumnDef {
  key: keyof Book;
  /** Human header used in CSV/Excel exports and accepted on import. */
  header: string;
  toCell: (book: Book) => string | number | boolean;
  fromCell: (raw: string) => unknown;
}

const s = (v: string) => v.trim();
const num = (v: string) => {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const bool = (v: string) => /^(true|yes|1)$/i.test(v.trim());
const tags = (v: string) =>
  v
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean);

export const BOOK_COLUMNS: ColumnDef[] = [
  { key: 'id', header: 'ID', toCell: (b) => b.id, fromCell: s },
  { key: 'serialNumber', header: 'Serial Number', toCell: (b) => b.serialNumber, fromCell: s },
  { key: 'title', header: 'Title', toCell: (b) => b.title, fromCell: s },
  { key: 'subtitle', header: 'Subtitle', toCell: (b) => b.subtitle, fromCell: s },
  { key: 'author', header: 'Author', toCell: (b) => b.author, fromCell: s },
  { key: 'coAuthors', header: 'Co-authors', toCell: (b) => b.coAuthors, fromCell: s },
  { key: 'translator', header: 'Translator', toCell: (b) => b.translator, fromCell: s },
  { key: 'editor', header: 'Editor', toCell: (b) => b.editor, fromCell: s },
  { key: 'publisher', header: 'Publisher', toCell: (b) => b.publisher, fromCell: s },
  { key: 'edition', header: 'Edition', toCell: (b) => b.edition, fromCell: s },
  { key: 'printedDate', header: 'Printed Date', toCell: (b) => b.printedDate, fromCell: s },
  {
    key: 'publicationYear',
    header: 'Publication Year',
    toCell: (b) => b.publicationYear ?? '',
    fromCell: num,
  },
  { key: 'isbn10', header: 'ISBN-10', toCell: (b) => b.isbn10, fromCell: s },
  { key: 'isbn13', header: 'ISBN-13', toCell: (b) => b.isbn13, fromCell: s },
  { key: 'language', header: 'Language', toCell: (b) => b.language, fromCell: s },
  { key: 'category', header: 'Category', toCell: (b) => b.category, fromCell: s },
  { key: 'subcategory', header: 'Subcategory', toCell: (b) => b.subcategory, fromCell: s },
  { key: 'priceNpr', header: 'Price (NPR)', toCell: (b) => b.priceNpr ?? '', fromCell: num },
  { key: 'purchaseDate', header: 'Purchase Date', toCell: (b) => b.purchaseDate, fromCell: s },
  {
    key: 'purchaseSource',
    header: 'Purchase Source',
    toCell: (b) => b.purchaseSource,
    fromCell: s,
  },
  { key: 'room', header: 'Room', toCell: (b) => b.room, fromCell: s },
  { key: 'shelf', header: 'Shelf', toCell: (b) => b.shelf, fromCell: s },
  { key: 'condition', header: 'Condition', toCell: (b) => b.condition, fromCell: s },
  { key: 'status', header: 'Status', toCell: (b) => b.status, fromCell: s },
  {
    key: 'readingStatus',
    header: 'Reading Status',
    toCell: (b) => b.readingStatus,
    fromCell: s,
  },
  { key: 'pages', header: 'Pages', toCell: (b) => b.pages ?? '', fromCell: num },
  { key: 'notes', header: 'Notes', toCell: (b) => b.notes, fromCell: s },
  {
    key: 'tags',
    header: 'Tags',
    toCell: (b) => b.tags.join('; '),
    fromCell: tags,
  },
  { key: 'coverImageUrl', header: 'Cover Image URL', toCell: (b) => b.coverImageUrl, fromCell: s },
  { key: 'qrCode', header: 'QR Code', toCell: (b) => b.qrCode, fromCell: s },
  { key: 'barcode', header: 'Barcode', toCell: (b) => b.barcode, fromCell: s },
  { key: 'borrowedTo', header: 'Borrowed To', toCell: (b) => b.borrowedTo, fromCell: s },
  { key: 'borrowDate', header: 'Borrow Date', toCell: (b) => b.borrowDate, fromCell: s },
  { key: 'returnDate', header: 'Return Date', toCell: (b) => b.returnDate, fromCell: s },
  { key: 'favorite', header: 'Favorite', toCell: (b) => b.favorite, fromCell: bool },
  { key: 'createdAt', header: 'Created At', toCell: (b) => b.createdAt, fromCell: s },
  { key: 'updatedAt', header: 'Updated At', toCell: (b) => b.updatedAt, fromCell: s },
  { key: 'deletedAt', header: 'Deleted At', toCell: (b) => b.deletedAt ?? '', fromCell: (v) => (v.trim() === '' ? null : v.trim()) },
];

/** Case/space-insensitive header lookup for CSV import. Accepts both the
 *  human header ("Price (NPR)") and the machine key ("priceNpr"). */
export function matchColumn(header: string): ColumnDef | undefined {
  const norm = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BOOK_COLUMNS.find(
    (c) =>
      c.header.toLowerCase().replace(/[^a-z0-9]/g, '') === norm ||
      c.key.toLowerCase() === norm,
  );
}
