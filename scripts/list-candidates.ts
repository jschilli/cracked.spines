import { readBooksJson } from './lib/book-io.js';
import { success, failure, outputResult } from './lib/result.js';

async function main() {
  const booksJsonPath = getArg('--books-json');
  if (!booksJsonPath) {
    outputResult(failure('Missing required argument: --books-json <path>'));
    return;
  }

  try {
    const books = await readBooksJson(booksJsonPath);
    const candidates = books
      .filter(b => b.status === 'Candidate')
      .map(b => `${b.title}, ${b.author}`);

    outputResult(success({ candidates }));
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

main();
