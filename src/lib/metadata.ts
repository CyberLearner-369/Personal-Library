import type { BookInput } from '@/types/book';
import { parseIsbnInput } from './isbn';

/**
 * Smart autofill: given an ISBN, fetch bibliographic data from Google Books,
 * falling back to Open Library. Both are free and keyless. Returned fields
 * only ever *fill* — the form never overwrites what the user already typed.
 */
export interface IsbnLookupResult {
  fields: Partial<BookInput>;
  suggestedTags: string[];
  source: 'google-books' | 'open-library';
}

export async function lookupIsbn(raw: string): Promise<IsbnLookupResult | null> {
  const parsed = parseIsbnInput(raw);
  if (!parsed) return null;
  const isbn = parsed.isbn13 || parsed.isbn10;

  const google = await lookupGoogleBooks(isbn).catch(() => null);
  if (google) return { ...google, fields: { ...parsed, ...google.fields } };

  const openLib = await lookupOpenLibrary(isbn).catch(() => null);
  if (openLib) return { ...openLib, fields: { ...parsed, ...openLib.fields } };

  return { fields: parsed, suggestedTags: [], source: 'google-books' };
}

async function lookupGoogleBooks(
  isbn: string,
): Promise<Omit<IsbnLookupResult, 'source'> & { source: 'google-books' } | null> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&country=US`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        pageCount?: number;
        language?: string;
        categories?: string[];
        imageLinks?: { thumbnail?: string };
      };
    }>;
  };
  const info = data.items?.[0]?.volumeInfo;
  if (!info) return null;

  const [author = '', ...coAuthors] = info.authors ?? [];
  const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : NaN;
  const categories = (info.categories ?? []).flatMap((c) => c.split(' / '));
  const thumbnail = info.imageLinks?.thumbnail?.replace(/^http:\/\//, 'https://') ?? '';

  return {
    source: 'google-books',
    fields: prune({
      title: info.title,
      subtitle: info.subtitle,
      author,
      coAuthors: coAuthors.join(', '),
      publisher: info.publisher,
      publicationYear: Number.isFinite(year) ? year : undefined,
      pages: info.pageCount && info.pageCount > 0 ? info.pageCount : undefined,
      language: languageName(info.language),
      category: categories[0],
      subcategory: categories[1],
      coverImageUrl: thumbnail || undefined,
    }),
    suggestedTags: dedupe(categories.map((c) => c.toLowerCase())).slice(0, 6),
  };
}

async function lookupOpenLibrary(
  isbn: string,
): Promise<Omit<IsbnLookupResult, 'source'> & { source: 'open-library' } | null> {
  const key = `ISBN:${isbn}`;
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(key)}&format=json&jscmd=data`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Record<
    string,
    {
      title?: string;
      subtitle?: string;
      authors?: Array<{ name: string }>;
      publishers?: Array<{ name: string }>;
      publish_date?: string;
      number_of_pages?: number;
      subjects?: Array<{ name: string }>;
      cover?: { medium?: string };
    }
  >;
  const info = data[key];
  if (!info) return null;

  const [author, ...coAuthors] = (info.authors ?? []).map((a) => a.name);
  const yearMatch = /\d{4}/.exec(info.publish_date ?? '');
  const subjects = (info.subjects ?? []).map((s) => s.name);

  return {
    source: 'open-library',
    fields: prune({
      title: info.title,
      subtitle: info.subtitle,
      author,
      coAuthors: coAuthors.join(', '),
      publisher: info.publishers?.[0]?.name,
      publicationYear: yearMatch ? Number(yearMatch[0]) : undefined,
      pages: info.number_of_pages,
      category: subjects[0],
      coverImageUrl: info.cover?.medium?.replace(/^http:\/\//, 'https://'),
    }),
    suggestedTags: dedupe(subjects.map((s) => s.toLowerCase())).slice(0, 6),
  };
}

function prune(fields: Record<string, unknown>): Partial<BookInput> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out as Partial<BookInput>;
}

function dedupe(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))];
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ne: 'Nepali',
  hi: 'Hindi',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ja: 'Japanese',
  zh: 'Chinese',
  ru: 'Russian',
  sa: 'Sanskrit',
};

function languageName(code?: string): string | undefined {
  if (!code) return undefined;
  return LANGUAGE_NAMES[code] ?? code;
}
