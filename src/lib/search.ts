import type { Book, BookStatus, ReadingStatus, Condition } from '@/types/book';
import { normalizeText } from './duplicates';
import { collator } from './utils';

/** All list-page state lives in the URL so views are shareable/bookmarkable
 *  (e.g. the sidebar's Wishlist link is just /books?status=wishlist). */
export interface BookQuery {
  q: string;
  status: BookStatus | '';
  readingStatus: ReadingStatus | '';
  condition: Condition | '';
  author: string;
  publisher: string;
  language: string;
  category: string;
  room: string;
  shelf: string;
  tag: string;
  favorite: boolean;
  yearFrom: number | null;
  yearTo: number | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: SortKey;
}

export type SortKey =
  | 'recent'
  | 'title'
  | 'author'
  | 'purchase-desc'
  | 'price-desc'
  | 'price-asc'
  | 'year-desc'
  | 'serial';

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'recent', label: 'Recently added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'author', label: 'Author A–Z' },
  { value: 'purchase-desc', label: 'Purchase date (newest)' },
  { value: 'price-desc', label: 'Price (high to low)' },
  { value: 'price-asc', label: 'Price (low to high)' },
  { value: 'year-desc', label: 'Publication year (newest)' },
  { value: 'serial', label: 'Serial number' },
];

export function emptyQuery(): BookQuery {
  return {
    q: '',
    status: '',
    readingStatus: '',
    condition: '',
    author: '',
    publisher: '',
    language: '',
    category: '',
    room: '',
    shelf: '',
    tag: '',
    favorite: false,
    yearFrom: null,
    yearTo: null,
    priceMin: null,
    priceMax: null,
    sort: 'recent',
  };
}

export function queryFromParams(params: URLSearchParams): BookQuery {
  const q = emptyQuery();
  const num = (key: string) => {
    const v = params.get(key);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  q.q = params.get('q') ?? '';
  q.status = (params.get('status') as BookQuery['status']) ?? '';
  q.readingStatus = (params.get('reading') as BookQuery['readingStatus']) ?? '';
  q.condition = (params.get('condition') as BookQuery['condition']) ?? '';
  q.author = params.get('author') ?? '';
  q.publisher = params.get('publisher') ?? '';
  q.language = params.get('language') ?? '';
  q.category = params.get('category') ?? '';
  q.room = params.get('room') ?? '';
  q.shelf = params.get('shelf') ?? '';
  q.tag = params.get('tag') ?? '';
  q.favorite = params.get('favorite') === '1';
  q.yearFrom = num('yearFrom');
  q.yearTo = num('yearTo');
  q.priceMin = num('priceMin');
  q.priceMax = num('priceMax');
  q.sort = (params.get('sort') as SortKey) || 'recent';
  return q;
}

export function queryToParams(query: BookQuery): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | null | boolean) => {
    if (value === null || value === '' || value === false) return;
    params.set(key, String(value === true ? 1 : value));
  };
  set('q', query.q);
  set('status', query.status);
  set('reading', query.readingStatus);
  set('condition', query.condition);
  set('author', query.author);
  set('publisher', query.publisher);
  set('language', query.language);
  set('category', query.category);
  set('room', query.room);
  set('shelf', query.shelf);
  set('tag', query.tag);
  set('favorite', query.favorite);
  set('yearFrom', query.yearFrom);
  set('yearTo', query.yearTo);
  set('priceMin', query.priceMin);
  set('priceMax', query.priceMax);
  if (query.sort !== 'recent') set('sort', query.sort);
  return params;
}

export function countActiveFilters(query: BookQuery): number {
  let n = 0;
  if (query.status) n++;
  if (query.readingStatus) n++;
  if (query.condition) n++;
  if (query.author) n++;
  if (query.publisher) n++;
  if (query.language) n++;
  if (query.category) n++;
  if (query.room) n++;
  if (query.shelf) n++;
  if (query.tag) n++;
  if (query.favorite) n++;
  if (query.yearFrom !== null || query.yearTo !== null) n++;
  if (query.priceMin !== null || query.priceMax !== null) n++;
  return n;
}

/** Pre-computed haystack per book; cached in a WeakMap so typing in the
 *  search box never re-normalizes the whole library. */
const haystacks = new WeakMap<Book, string>();

function haystack(book: Book): string {
  let h = haystacks.get(book);
  if (!h) {
    h = normalizeText(
      [
        book.title,
        book.subtitle,
        book.author,
        book.coAuthors,
        book.translator,
        book.editor,
        book.publisher,
        book.edition,
        book.isbn10,
        book.isbn13,
        book.serialNumber,
        book.category,
        book.subcategory,
        book.language,
        book.room,
        book.shelf,
        book.purchaseSource,
        book.tags.join(' '),
        book.notes,
      ].join(' '),
    );
    haystacks.set(book, h);
  }
  return h;
}

export function applyQuery(books: Book[], query: BookQuery): Book[] {
  const tokens = normalizeText(query.q).split(' ').filter(Boolean);
  const eq = (a: string, b: string) => normalizeText(a) === normalizeText(b);

  const filtered = books.filter((book) => {
    if (tokens.length > 0) {
      const h = haystack(book);
      if (!tokens.every((t) => h.includes(t))) return false;
    }
    if (query.status && book.status !== query.status) return false;
    if (query.readingStatus && book.readingStatus !== query.readingStatus) return false;
    if (query.condition && book.condition !== query.condition) return false;
    if (query.author && !eq(book.author, query.author)) return false;
    if (query.publisher && !eq(book.publisher, query.publisher)) return false;
    if (query.language && !eq(book.language, query.language)) return false;
    if (query.category && !eq(book.category, query.category)) return false;
    if (query.room && !eq(book.room, query.room)) return false;
    if (query.shelf && !eq(book.shelf, query.shelf)) return false;
    if (query.tag && !book.tags.some((t) => eq(t, query.tag))) return false;
    if (query.favorite && !book.favorite) return false;
    const year = purchaseYear(book);
    if (query.yearFrom !== null && (year === null || year < query.yearFrom)) return false;
    if (query.yearTo !== null && (year === null || year > query.yearTo)) return false;
    if (query.priceMin !== null && (book.priceNpr ?? -1) < query.priceMin) return false;
    if (query.priceMax !== null && (book.priceNpr ?? Infinity) > query.priceMax)
      return false;
    return true;
  });

  return sortBooks(filtered, query.sort);
}

export function purchaseYear(book: Book): number | null {
  const m = /^(\d{4})/.exec(book.purchaseDate);
  return m ? Number(m[1]) : null;
}

export function sortBooks(books: Book[], sort: SortKey): Book[] {
  const copy = [...books];
  const byNum = (
    get: (b: Book) => number | null,
    dir: 1 | -1,
    missingLast = true,
  ) => {
    copy.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av === null && bv === null) return 0;
      if (av === null) return missingLast ? 1 : -1;
      if (bv === null) return missingLast ? -1 : 1;
      return (av - bv) * dir;
    });
  };
  switch (sort) {
    case 'title':
      copy.sort((a, b) => collator.compare(a.title, b.title));
      break;
    case 'author':
      copy.sort(
        (a, b) => collator.compare(a.author, b.author) || collator.compare(a.title, b.title),
      );
      break;
    case 'purchase-desc':
      copy.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));
      break;
    case 'price-desc':
      byNum((b) => b.priceNpr, -1);
      break;
    case 'price-asc':
      byNum((b) => b.priceNpr, 1);
      break;
    case 'year-desc':
      byNum((b) => b.publicationYear, -1);
      break;
    case 'serial':
      copy.sort((a, b) => collator.compare(a.serialNumber, b.serialNumber));
      break;
    case 'recent':
    default:
      copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return copy;
}

/** Distinct non-empty values of a field, most frequent first — feeds the
 *  filter dropdowns and form autocomplete. */
export function distinctValues(books: Book[], get: (b: Book) => string): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const book of books) {
    const label = get(book).trim();
    if (!label) continue;
    const key = normalizeText(label);
    const entry = counts.get(key);
    if (entry) entry.n++;
    else counts.set(key, { label, n: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || collator.compare(a.label, b.label))
    .map((e) => e.label);
}

export function distinctTags(books: Book[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const book of books) {
    for (const tag of book.tags) {
      const key = normalizeText(tag);
      const entry = counts.get(key);
      if (entry) entry.n++;
      else counts.set(key, { label: tag, n: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || collator.compare(a.label, b.label))
    .map((e) => e.label);
}
