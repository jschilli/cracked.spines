import { readBooksJson, writeBooksJson } from './lib/book-io.js';
import { success, failure, outputResult } from './lib/result.js';

async function main() {
  const booksJsonPath = getArg('--books-json');
  if (!booksJsonPath) {
    outputResult(failure('Missing required argument: --books-json <path>'));
    return;
  }

  try {
    const books = await readBooksJson(booksJsonPath);
    const now = new Date().toISOString();
    const affected: { title: string; pollCount: number }[] = [];

    for (const book of books) {
      if (book.status === 'Candidate') {
        book.pollCount += 1;
        book.updatedAt = now;
        affected.push({ title: book.title, pollCount: book.pollCount });
      }
    }

    await writeBooksJson(booksJsonPath, books);
    outputResult(success(affected));
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

main();
