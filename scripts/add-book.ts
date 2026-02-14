import { readBooksJson, writeBooksJson, findDuplicate } from './lib/book-io.js';
import { scrapeDataSchema } from './lib/schemas.js';
import { success, failure, outputResult } from './lib/result.js';
import type { Book } from './lib/types.js';

async function main() {
  const booksJsonPath = getArg('--books-json');
  if (!booksJsonPath) {
    outputResult(failure('Missing required argument: --books-json <path>'));
    return;
  }

  try {
    // Read stdin
    const input = await readStdin();
    const parsed = JSON.parse(input);
    const validated = scrapeDataSchema.parse(parsed);

    // Read books
    const books = await readBooksJson(booksJsonPath);

    // Check duplicates
    const dup = findDuplicate(books, validated);
    if (dup) {
      outputResult(failure(`Duplicate found: "${dup.title}" (id: ${dup.id}) matches on ${getDupReason(dup, validated)}`));
      return;
    }

    // Derive coverImage relative path from coverImagePath
    let coverImage: string | null = null;
    if (validated.coverImagePath) {
      // Extract "images/<filename>" from the full path
      const match = validated.coverImagePath.match(/(images\/[^/]+)$/);
      coverImage = match ? match[1] : validated.coverImagePath;
    }

    const now = new Date().toISOString();
    const newBook: Book = {
      id: Date.now().toString(),
      title: validated.title,
      author: validated.author,
      status: 'Candidate',
      selectedForDate: null,
      createdAt: now,
      updatedAt: now,
      coverImage,
      link: validated.link,
      pollCount: 0,
    };

    if (validated.isbn) {
      newBook.isbn = validated.isbn;
    }
    if (validated.pages != null) {
      newBook.pages = validated.pages;
    }
    if (validated.goodreadsId != null) {
      newBook.goodreadsId = validated.goodreadsId;
    }

    books.push(newBook);
    await writeBooksJson(booksJsonPath, books);

    outputResult(success(newBook));
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function getDupReason(existing: Book, candidate: { isbn: string | null; goodreadsId: string | null; title: string }): string {
  if (candidate.isbn && existing.isbn === candidate.isbn) return `isbn "${candidate.isbn}"`;
  if (candidate.goodreadsId && existing.goodreadsId === candidate.goodreadsId) return `goodreadsId "${candidate.goodreadsId}"`;
  return `title "${candidate.title}"`;
}

main();
