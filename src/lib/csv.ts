import { BOOK_COLUMNS, matchColumn } from './columns';
import type { Book } from '@/types/book';
import { emptyBookInput } from '@/types/book';

/**
 * RFC 4180 CSV with two production hardening measures:
 * 1. UTF-8 BOM on export so Excel opens Devanagari and other non-Latin
 *    scripts correctly.
 * 2. Formula-injection guard: any cell beginning with = + - @ is prefixed
 *    with a single quote so it can never execute when opened in a
 *    spreadsheet application (OWASP CSV injection).
 */

export function escapeCsvCell(value: string | number | boolean): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function booksToCsv(books: Book[]): string {
  const header = BOOK_COLUMNS.map((c) => escapeCsvCell(c.header)).join(',');
  const rows = books.map((book) =>
    BOOK_COLUMNS.map((c) => escapeCsvCell(c.toCell(book))).join(','),
  );
  return `\uFEFF${[header, ...rows].join('\r\n')}\r\n`;
}

/** Streaming-free but robust CSV parser: quotes, escaped quotes, newlines
 *  inside cells, CRLF/LF, and a leading BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop fully empty trailing rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface CsvImportRow {
  rowNumber: number;
  input: ReturnType<typeof emptyBookInput> & { id?: string };
  errors: string[];
}

export interface CsvImportResult {
  rows: CsvImportRow[];
  unknownHeaders: string[];
  errorCount: number;
}

/** Map arbitrary CSV text onto BookInput rows, collecting per-row errors
 *  instead of failing the whole file. Strips the injection-guard quote. */
export function csvToBookRows(text: string): CsvImportResult {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], unknownHeaders: [], errorCount: 0 };

  const headerCells = table[0];
  const mapping = headerCells.map((h) => matchColumn(h) ?? null);
  const unknownHeaders = headerCells.filter((_, i) => mapping[i] === null);

  if (!mapping.some((m) => m?.key === 'title')) {
    return {
      rows: [],
      unknownHeaders,
      errorCount: 1,
    };
  }

  const rows: CsvImportRow[] = table.slice(1).map((cells, index) => {
    const input = emptyBookInput() as CsvImportRow['input'];
    const errors: string[] = [];
    mapping.forEach((col, i) => {
      if (!col) return;
      const raw = (cells[i] ?? '').replace(/^'(?=[=+\-@])/, '');
      const value = col.fromCell(raw);
      if (col.key === 'id') {
        if (typeof value === 'string' && value) input.id = value;
        return;
      }
      if (col.key === 'createdAt' || col.key === 'updatedAt' || col.key === 'deletedAt') {
        return; // system fields are always regenerated on import
      }
      (input as Record<string, unknown>)[col.key] = value;
    });
    if (!input.title.trim()) errors.push('Title is required');
    if (input.priceNpr !== null && input.priceNpr < 0) errors.push('Price cannot be negative');
    if (input.pages !== null && input.pages <= 0) errors.push('Pages must be positive');
    return { rowNumber: index + 2, input, errors };
  });

  return {
    rows,
    unknownHeaders,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
  };
}

export function downloadFile(filename: string, content: string | Blob, mime: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
