import { describe, expect, it } from 'vitest';
import { computeStats } from '@/lib/stats';
import { makeBook } from '@/test/factories';

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

describe('computeStats', () => {
  const books = [
    makeBook({ title: 'Owned', priceNpr: 100, category: 'Fiction', pages: 200 }),
    makeBook({
      title: 'Lent long ago',
      priceNpr: 50,
      status: 'lent',
      borrowDate: daysAgoIso(60),
      borrowedTo: 'Asha',
      readingStatus: 'finished',
    }),
    makeBook({ title: 'Wished', priceNpr: 999, status: 'wishlist' }),
    makeBook({ title: 'Gone', priceNpr: 5000, deletedAt: '2026-01-01T00:00:00.000Z' }),
  ];
  const stats = computeStats(books);

  it('counts only the physical shelf (no wishlist, no deleted)', () => {
    expect(stats.totalBooks).toBe(2);
    expect(stats.wishlist).toBe(1);
  });

  it('sums money and pages across the shelf only', () => {
    expect(stats.totalSpent).toBe(150);
    expect(stats.totalPages).toBe(200);
    expect(stats.mostExpensive?.title).toBe('Owned');
  });

  it('tracks reading and loan health', () => {
    expect(stats.read).toBe(1);
    expect(stats.unread).toBe(1);
    expect(stats.overdueLoans.map((b) => b.title)).toEqual(['Lent long ago']);
  });

  it('tallies categories with a bucket for the uncatalogued', () => {
    const fiction = stats.byCategory.find((i) => i.label === 'Fiction');
    expect(fiction?.count).toBe(1);
    expect(stats.byCategory.find((i) => i.label === 'Uncatalogued')?.count).toBe(1);
  });
});
