import { describe, expect, it } from 'vitest';
import { booksToCsv, csvToBookRows, escapeCsvCell, parseCsv } from '@/lib/csv';
import { makeBook } from '@/test/factories';

describe('CSV parser', () => {
  it('handles quotes, escaped quotes, commas and newlines in cells', () => {
    const rows = parseCsv('a,"b,1","c ""quoted""","line1\nline2"\r\nnext,,,\n');
    expect(rows[0]).toEqual(['a', 'b,1', 'c "quoted"', 'line1\nline2']);
    expect(rows[1][0]).toBe('next');
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('\uFEFFTitle\nX')[0]).toEqual(['Title']);
  });
});

describe('formula-injection guard', () => {
  it('neutralises leading =, +, -, @ on export', () => {
    expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('safe')).toBe('safe');
  });

  it('round-trips guarded values back to the original', () => {
    const book = makeBook({ title: '=HYPERLINK("evil")' });
    const parsed = csvToBookRows(booksToCsv([book]));
    expect(parsed.rows[0].input.title).toBe('=HYPERLINK("evil")');
  });
});

describe('export → import round trip', () => {
  it('preserves every meaningful field', () => {
    const book = makeBook({
      title: 'Norwegian Wood, Vol. 1',
      author: 'Haruki Murakami',
      notes: 'Bought in Thamel.\n"Signed" copy, shelf A-2',
      tags: ['fiction', 'japan'],
      priceNpr: 1250,
      pages: 296,
      publicationYear: 2000,
      isbn13: '9780306406157',
      favorite: true,
    });
    const result = csvToBookRows(booksToCsv([book]));
    expect(result.errorCount).toBe(0);
    const row = result.rows[0];
    expect(row.input.id).toBe(book.id);
    expect(row.input.title).toBe(book.title);
    expect(row.input.notes).toBe(book.notes);
    expect(row.input.tags).toEqual(book.tags);
    expect(row.input.priceNpr).toBe(1250);
    expect(row.input.pages).toBe(296);
    expect(row.input.publicationYear).toBe(2000);
    expect(row.input.favorite).toBe(true);
  });

  it('collects row errors without failing the file', () => {
    const csv = 'Title,Price (NPR)\nGood Book,100\n,50\nAnother,-5\n';
    const result = csvToBookRows(csv);
    expect(result.rows).toHaveLength(3);
    expect(result.errorCount).toBe(2);
    expect(result.rows[1].errors[0]).toMatch(/Title/);
  });

  it('matches headers flexibly (case, punctuation, camelCase keys)', () => {
    const result = csvToBookRows('TITLE,pricenpr\nX,42\n');
    expect(result.rows[0].input.priceNpr).toBe(42);
    expect(result.unknownHeaders).toHaveLength(0);
  });
});
