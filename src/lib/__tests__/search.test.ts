import { describe, expect, it } from 'vitest';
import {
  applyQuery,
  distinctValues,
  emptyQuery,
  queryFromParams,
  queryToParams,
} from '@/lib/search';
import { makeBook } from '@/test/factories';

const shelf = [
  makeBook({
    title: 'Norwegian Wood',
    author: 'Haruki Murakami',
    tags: ['fiction'],
    priceNpr: 1200,
    purchaseDate: '2023-05-01',
    status: 'owned',
  }),
  makeBook({
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    category: 'History',
    priceNpr: null,
    status: 'owned',
    readingStatus: 'finished',
  }),
  makeBook({
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    priceNpr: 300,
    purchaseDate: '2021-02-10',
    status: 'lent',
    favorite: true,
  }),
];

describe('applyQuery', () => {
  it('AND-matches every search token across fields', () => {
    const result = applyQuery(shelf, { ...emptyQuery(), q: 'murakami wood' });
    expect(result.map((b) => b.title)).toEqual(['Norwegian Wood']);
    expect(applyQuery(shelf, { ...emptyQuery(), q: 'murakami hobbit' })).toHaveLength(0);
  });

  it('filters by status, favorite and price range (nulls excluded)', () => {
    expect(applyQuery(shelf, { ...emptyQuery(), status: 'lent' })).toHaveLength(1);
    expect(applyQuery(shelf, { ...emptyQuery(), favorite: true })[0].title).toBe(
      'The Hobbit',
    );
    const priced = applyQuery(shelf, { ...emptyQuery(), priceMin: 200, priceMax: 500 });
    expect(priced.map((b) => b.title)).toEqual(['The Hobbit']);
  });

  it('filters by purchase-year range', () => {
    const result = applyQuery(shelf, { ...emptyQuery(), yearFrom: 2022, yearTo: 2024 });
    expect(result.map((b) => b.title)).toEqual(['Norwegian Wood']);
  });

  it('sorts by price descending with missing prices last', () => {
    const result = applyQuery(shelf, { ...emptyQuery(), sort: 'price-desc' });
    expect(result.map((b) => b.title)).toEqual([
      'Norwegian Wood',
      'The Hobbit',
      'Sapiens',
    ]);
  });
});

describe('query ↔ URL round trip', () => {
  it('serialises only non-defaults and parses back losslessly', () => {
    const query = {
      ...emptyQuery(),
      q: 'wood',
      status: 'lent' as const,
      favorite: true,
      priceMin: 100,
      sort: 'price-desc' as const,
    };
    const params = queryToParams(query);
    expect(params.get('reading')).toBeNull();
    expect(queryFromParams(params)).toEqual(query);
  });
});

describe('distinctValues', () => {
  it('orders by frequency, merging case/diacritic variants', () => {
    const books = [
      makeBook({ publisher: 'Penguin' }),
      makeBook({ publisher: 'penguin' }),
      makeBook({ publisher: 'Fine Print' }),
    ];
    expect(distinctValues(books, (b) => b.publisher)).toEqual(['Penguin', 'Fine Print']);
  });
});
