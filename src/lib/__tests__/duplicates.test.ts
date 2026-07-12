import { describe, expect, it } from 'vitest';
import { findDuplicates, normalizeText } from '@/lib/duplicates';
import { makeBook } from '@/test/factories';

describe('normalizeText', () => {
  it('strips diacritics, punctuation and case', () => {
    expect(normalizeText('Café—Society!')).toBe('cafe society');
    expect(normalizeText('  NORWEGIAN   Wood ')).toBe('norwegian wood');
  });
});

describe('findDuplicates', () => {
  const shelf = [
    makeBook({ id: 'a', title: 'Norwegian Wood', author: 'Haruki Murakami', isbn13: '9780306406157' }),
    makeBook({ id: 'b', title: 'Kafka on the Shore', author: 'Haruki Murakami', isbn10: '0306406152' }),
    makeBook({ id: 'c', title: 'Deleted Twin', author: 'X', deletedAt: '2026-01-01T00:00:00.000Z' }),
  ];

  it('matches on ISBN-13 first', () => {
    const hits = findDuplicates(
      { title: 'Different', author: '', isbn10: '', isbn13: '9780306406157' },
      shelf,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ reason: 'isbn13', book: { id: 'a' } });
  });

  it('matches on normalised title + author', () => {
    const hits = findDuplicates(
      { title: 'norwegian wood!', author: 'HARUKI Murakami', isbn10: '', isbn13: '' },
      shelf,
    );
    expect(hits[0].reason).toBe('title-author');
  });

  it('ignores soft-deleted books and the record being edited', () => {
    expect(
      findDuplicates({ title: 'Deleted Twin', author: 'X', isbn10: '', isbn13: '' }, shelf),
    ).toHaveLength(0);
    expect(
      findDuplicates(
        { title: 'Norwegian Wood', author: 'Haruki Murakami', isbn10: '', isbn13: '' },
        shelf,
        'a',
      ),
    ).toHaveLength(0);
  });
});
