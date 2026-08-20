import { describe, it, expect } from 'vitest';
import { findBookByTitle } from './book-io.js';
import type { Book } from './types.js';

const book = (title: string) => ({ title }) as Book;

describe('findBookByTitle', () => {
  const books = [
    book('Easy Money: Cryptocurrency, Casino Capitalism: The Basis for the Documentary'),
    book('The River of Doubt'),
    book('The River of Doubt: Theodore Roosevelt'),
  ];

  it('matches on exact title, case- and space-insensitively', () => {
    expect(findBookByTitle(books, '  the river of doubt ')?.title).toBe('The River of Doubt');
  });

  it('falls back to a unique prefix match when the ballot drops a subtitle', () => {
    expect(findBookByTitle(books, 'Easy Money: Cryptocurrency, Casino Capitalism')?.title).toBe(books[0].title);
  });

  it('returns undefined when a prefix is ambiguous or matches nothing', () => {
    expect(findBookByTitle(books, 'The River')).toBeUndefined();
    expect(findBookByTitle(books, 'Moby-Dick')).toBeUndefined();
  });
});
