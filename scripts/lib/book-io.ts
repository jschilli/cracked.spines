import { readFile, writeFile } from 'node:fs/promises';
import { booksArraySchema } from './schemas.js';
import type { Book } from './types.js';

export async function readBooksJson(path: string): Promise<Book[]> {
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw);
  return booksArraySchema.parse(parsed) as Book[];
}

export async function writeBooksJson(path: string, books: Book[]): Promise<void> {
  const json = JSON.stringify(books, null, 2) + '\n';
  await writeFile(path, json, 'utf-8');
}

/**
 * Exact title match, falling back to a unique prefix match. Ballot titles are
 * display titles and can be shorter than the canonical record (the November 2026
 * "Easy Money" entry dropped a long subtitle). Ambiguous prefixes match nothing.
 */
export function findBookByTitle(books: Book[], title: string): Book | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(title);

  const exact = books.find(b => norm(b.title) === target);
  if (exact) return exact;

  const prefix = books.filter(b => norm(b.title).startsWith(target) || target.startsWith(norm(b.title)));
  return prefix.length === 1 ? prefix[0] : undefined;
}

export function findDuplicate(books: Book[], candidate: { isbn: string | null; goodreadsId: string | null; title: string }): Book | undefined {
  return books.find(b => {
    if (candidate.isbn && b.isbn === candidate.isbn) return true;
    if (candidate.goodreadsId && b.goodreadsId === candidate.goodreadsId) return true;
    if (b.title.toLowerCase().trim() === candidate.title.toLowerCase().trim()) return true;
    return false;
  });
}
