import { readBooksJson, writeBooksJson, findBookByTitle } from './lib/book-io.js';
import { pollResultsInputSchema } from './lib/schemas.js';
import { calculateNextSelectionDate } from './lib/dates.js';
import { success, failure, outputResult } from './lib/result.js';
import type { PollResultsOutput } from './lib/types.js';

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);
    const { rankedTitles, booksJsonPath } = pollResultsInputSchema.parse(parsed);

    const books = await readBooksJson(booksJsonPath);
    const warnings: string[] = [];
    const now = new Date().toISOString();

    // Match titles to candidate books
    const matchedBooks: { title: string; index: number; rank: number }[] = [];
    for (let rank = 0; rank < rankedTitles.length; rank++) {
      const title = rankedTitles[rank];
      const book = findBookByTitle(books, title);
      if (!book) {
        warnings.push(`Title not found in books.json: "${title}"`);
        continue;
      }
      if (book.status !== 'Candidate') {
        warnings.push(`"${title}" has status "${book.status}", expected "Candidate"`);
        continue;
      }
      const idx = books.indexOf(book);
      matchedBooks.push({ title: book.title, index: idx, rank: rank + 1 });
    }

    // Mark previous book as Read
    let markedAsRead: { title: string } | null = null;
    const selectedBooks = books.filter(b => b.status === 'Selected' && b.selectedForDate);
    if (selectedBooks.length > 0) {
      // Find the Selected book with the earliest selectedForDate in the past
      const today = new Date().toISOString().slice(0, 10);
      const pastSelected = selectedBooks
        .filter(b => b.selectedForDate! <= today)
        .sort((a, b) => a.selectedForDate!.localeCompare(b.selectedForDate!));

      if (pastSelected.length > 0) {
        const bookToRead = pastSelected[0];
        bookToRead.status = 'Read';
        bookToRead.updatedAt = now;
        markedAsRead = { title: bookToRead.title };
      }
    }

    // Select rank 1
    const winner = matchedBooks.find(m => m.rank === 1);
    if (!winner) {
      outputResult(failure('No valid rank 1 book found in poll results'));
      return;
    }

    // Calculate selectedForDate
    const currentSelectedDates = books
      .filter(b => b.status === 'Selected' && b.selectedForDate)
      .map(b => b.selectedForDate!);
    const { date: selectedForDate, warnings: dateWarnings } = calculateNextSelectionDate(currentSelectedDates);
    warnings.push(...dateWarnings);

    books[winner.index].status = 'Selected';
    books[winner.index].selectedForDate = selectedForDate;
    books[winner.index].updatedAt = now;

    // Survived (ranks 2-10) — no changes needed, they stay as Candidate
    const survived = matchedBooks
      .filter(m => m.rank >= 2 && m.rank <= 10)
      .map(m => m.title);

    // Relegate ranks 11+ (only if more than 10 total candidates in the poll)
    const relegated: string[] = [];
    if (matchedBooks.length > 10) {
      for (const m of matchedBooks) {
        if (m.rank >= 11) {
          books[m.index].status = 'Relegated';
          books[m.index].updatedAt = now;
          relegated.push(m.title);
        }
      }
    }

    // Warn if more than 3 Selected
    const selectedCount = books.filter(b => b.status === 'Selected').length;
    if (selectedCount > 3) {
      warnings.push(`${selectedCount} books now have Selected status (soft limit is 3)`);
    }

    await writeBooksJson(booksJsonPath, books);

    const result: PollResultsOutput = {
      markedAsRead,
      selected: { title: winner.title, selectedForDate },
      survived,
      relegated,
    };

    outputResult(success(result, warnings));
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

main();
