import { readBooksJson } from './lib/book-io.js';
import { execGit } from './lib/git.js';
import { booksArraySchema } from './lib/schemas.js';
import { success, failure, outputResult } from './lib/result.js';
import type { Book, DiffReport } from './lib/types.js';
import { join } from 'node:path';

async function main() {
  const repoPath = getArg('--repo-path');
  if (!repoPath) {
    outputResult(failure('Missing required argument: --repo-path <path>'));
    return;
  }

  try {
    const booksJsonPath = join(repoPath, 'books.json');

    // Read current books.json
    const currentBooks = await readBooksJson(booksJsonPath);

    // Read HEAD version of books.json via git show
    let previousBooks: Book[] = [];
    try {
      const headContent = await execGit(['show', 'HEAD:books.json'], repoPath);
      const parsed = JSON.parse(headContent);
      previousBooks = booksArraySchema.parse(parsed) as Book[];
    } catch {
      // No previous version (new file or no commits) — treat as empty
    }

    // Build lookup maps by id
    const prevById = new Map(previousBooks.map(b => [b.id, b]));
    const currById = new Map(currentBooks.map(b => [b.id, b]));

    const report: DiffReport = {
      booksAdded: [],
      statusChanges: [],
      pollCountChanges: [],
      selectedForDateChanges: [],
      otherFieldChanges: [],
      totalBooksBefore: previousBooks.length,
      totalBooksAfter: currentBooks.length,
      newImageFiles: [],
      stagedImageFiles: [],
    };

    // Find added books
    for (const book of currentBooks) {
      if (!prevById.has(book.id)) {
        const requiredFields = ['id', 'title', 'author', 'isbn', 'status', 'createdAt', 'updatedAt', 'link'] as const;
        const hasAllFields = requiredFields.every(f => book[f] != null && book[f] !== '');
        report.booksAdded.push({ title: book.title, status: book.status, hasAllFields });
      }
    }

    // Find changes in existing books
    for (const book of currentBooks) {
      const prev = prevById.get(book.id);
      if (!prev) continue;

      if (prev.status !== book.status) {
        report.statusChanges.push({ title: book.title, from: prev.status, to: book.status });
      }

      if (prev.pollCount !== book.pollCount) {
        report.pollCountChanges.push({ title: book.title, from: prev.pollCount, to: book.pollCount });
      }

      if (prev.selectedForDate !== book.selectedForDate) {
        report.selectedForDateChanges.push({ title: book.title, date: book.selectedForDate ?? null });
      }

      // Other field changes
      const trackedFields = ['title', 'author', 'isbn', 'coverImage', 'link', 'pages', 'goodreadsId'] as const;
      for (const field of trackedFields) {
        const prevVal = prev[field];
        const currVal = book[field];
        if (prevVal !== currVal) {
          report.otherFieldChanges.push({ title: book.title, field, from: prevVal, to: currVal });
        }
      }
    }

    // Check image files
    try {
      const statusOutput = await execGit(['status', '--porcelain', 'public/images/'], repoPath);
      for (const line of statusOutput.split('\n').filter(Boolean)) {
        const status = line.substring(0, 2).trim();
        const filePath = line.substring(3).trim();
        if (status === '??' || status === 'A') {
          report.newImageFiles.push(filePath);
        }
        if (status === 'A' || status === 'M') {
          report.stagedImageFiles.push(filePath);
        }
      }
    } catch {
      // No image changes or not a git repo
    }

    outputResult(success(report));
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

main();
