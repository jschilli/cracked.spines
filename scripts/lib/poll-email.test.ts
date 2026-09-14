import { describe, expect, it } from 'vitest';
import { renderCandidateRows, renderScheduleRows, staleSelections, upcomingMeetings } from './poll-email.js';
import type { Book } from './types.js';

const book = (over: Partial<Book>): Book =>
  ({
    id: over.title ?? 'x',
    title: 'T',
    author: 'A',
    isbn: null,
    status: 'Candidate',
    selectedForDate: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    coverImage: null,
    pages: null,
    link: null,
    pollCount: 1,
    ...over,
  }) as Book;

describe('upcomingMeetings', () => {
  it('returns Selected books soonest first, capped at the limit', () => {
    const books = [
      book({ title: 'C', status: 'Selected', selectedForDate: '2026-12-17' }),
      book({ title: 'A', status: 'Selected', selectedForDate: '2026-10-15' }),
      book({ title: 'D', status: 'Selected', selectedForDate: '2027-01-21' }),
      book({ title: 'B', status: 'Selected', selectedForDate: '2026-11-19' }),
      book({ title: 'Read one', status: 'Read', selectedForDate: '2026-09-17' }),
      book({ title: 'Cand', status: 'Candidate' }),
    ];
    expect(upcomingMeetings(books).map(m => m.title)).toEqual(['A', 'B', 'C']);
    expect(upcomingMeetings(books)[0].dateLabel).toBe('Thursday, October 15');
  });
});

describe('staleSelections', () => {
  it('flags a Selected meeting older than the latest Read one', () => {
    const books = [
      book({ title: 'Skipped', status: 'Selected', selectedForDate: '2026-09-17' }),
      book({ title: 'Done', status: 'Read', selectedForDate: '2026-10-15' }),
      book({ title: 'Future', status: 'Selected', selectedForDate: '2026-11-19' }),
    ];
    expect(staleSelections(books)).toEqual(['Skipped']);
  });

  it('is quiet when every Selected meeting is ahead of the last Read one', () => {
    const books = [
      book({ title: 'Done', status: 'Read', selectedForDate: '2026-10-15' }),
      book({ title: 'Future', status: 'Selected', selectedForDate: '2026-11-19' }),
    ];
    expect(staleSelections(books)).toEqual([]);
  });
});

describe('renderCandidateRows', () => {
  it('pills a debut, leaves a returning candidate bare, and escapes titles', () => {
    const html = renderCandidateRows([
      book({ title: 'Fresh & New', pollCount: 0 }),
      book({ title: 'Old Hand', pollCount: 4 }),
    ]);
    expect(html).toContain('Fresh &amp; New');
    expect(html.match(/>New</g)).toHaveLength(1);
    expect(html.indexOf('Old Hand')).toBeGreaterThan(html.indexOf('Fresh'));
  });
});

describe('renderScheduleRows', () => {
  it('emphasises only the soonest meeting', () => {
    const html = renderScheduleRows(upcomingMeetings([
      book({ title: 'Next', status: 'Selected', selectedForDate: '2026-11-19' }),
      book({ title: 'Later', status: 'Selected', selectedForDate: '2026-12-17' }),
    ]));
    expect(html.match(/font-weight:600;/g)).toHaveLength(1);
    expect(html).toContain('Thursday, November 19');
  });
});
