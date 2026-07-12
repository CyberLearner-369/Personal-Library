import { describe, expect, it } from 'vitest';
import {
  isbn10To13,
  isValidIsbn10,
  isValidIsbn13,
  looksLikeBookBarcode,
  parseIsbnInput,
} from '@/lib/isbn';

describe('ISBN validation', () => {
  it('accepts valid ISBN-10s, including X check digits', () => {
    expect(isValidIsbn10('0306406152')).toBe(true);
    expect(isValidIsbn10('097522980X')).toBe(true);
    expect(isValidIsbn10('0-306-40615-2')).toBe(true);
  });

  it('rejects ISBN-10s with a bad checksum or shape', () => {
    expect(isValidIsbn10('0306406153')).toBe(false);
    expect(isValidIsbn10('12345')).toBe(false);
    expect(isValidIsbn10('')).toBe(false);
  });

  it('accepts and rejects ISBN-13s by checksum', () => {
    expect(isValidIsbn13('9780306406157')).toBe(true);
    expect(isValidIsbn13('978-0-306-40615-7')).toBe(true);
    expect(isValidIsbn13('9780306406158')).toBe(false);
  });

  it('converts ISBN-10 to ISBN-13 with a correct new checksum', () => {
    expect(isbn10To13('0306406152')).toBe('9780306406157');
    expect(isbn10To13('bogus')).toBeNull();
  });

  it('parses either form and always yields a 13 when possible', () => {
    expect(parseIsbnInput('0306406152')).toEqual({
      isbn10: '0306406152',
      isbn13: '9780306406157',
    });
    expect(parseIsbnInput('9780306406157')).toEqual({
      isbn10: '',
      isbn13: '9780306406157',
    });
    expect(parseIsbnInput('not-an-isbn')).toBeNull();
  });

  it('recognises Bookland EAN barcodes', () => {
    expect(looksLikeBookBarcode('9780306406157')).toBe(true);
    expect(looksLikeBookBarcode('5012345678900')).toBe(false);
  });
});
