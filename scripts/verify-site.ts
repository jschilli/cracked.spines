import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { booksArraySchema } from './lib/schemas.js';
import { success, failure, outputResult } from './lib/result.js';
import type { VerifySiteResult } from './lib/types.js';

async function main() {
  const repoPath = getArg('--repo-path');
  if (!repoPath) {
    outputResult(failure('Missing required argument: --repo-path <path>'));
    return;
  }

  const result: VerifySiteResult = {
    jsonValid: false,
    schemaErrors: [],
    missingImages: [],
    buildExitCode: -1,
    buildErrors: [],
  };

  try {
    // 1. Validate books.json is well-formed JSON
    const booksJsonPath = join(repoPath, 'books.json');
    let rawBooks: unknown;
    try {
      const content = await readFile(booksJsonPath, 'utf-8');
      rawBooks = JSON.parse(content);
      result.jsonValid = true;
    } catch (err) {
      result.jsonValid = false;
      result.schemaErrors.push(`Invalid JSON: ${(err as Error).message}`);
      outputResult(success(result));
      return;
    }

    // 2. Validate every entry against the Book schema
    const parsed = booksArraySchema.safeParse(rawBooks);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        result.schemaErrors.push(`[${path}] ${issue.message}`);
      }
    }

    // 3. Check cover images exist
    if (Array.isArray(rawBooks)) {
      for (const book of rawBooks as { title?: string; coverImage?: string }[]) {
        if (book.coverImage) {
          const imagePath = join(repoPath, 'public', book.coverImage);
          try {
            await access(imagePath);
          } catch {
            result.missingImages.push(`${book.title}: ${book.coverImage}`);
          }
        }
      }
    }

    // 4. Run nuxt build
    const { exitCode, errors } = await runBuild(repoPath);
    result.buildExitCode = exitCode;
    result.buildErrors = errors;

    outputResult(success(result));
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

function runBuild(repoPath: string): Promise<{ exitCode: number; errors: string[] }> {
  return new Promise(resolve => {
    exec(
      'npx nuxt build --preset github_pages',
      { cwd: repoPath, maxBuffer: 50 * 1024 * 1024, timeout: 300000 },
      (error, _stdout, stderr) => {
        const errors = stderr
          ? stderr.split('\n').filter(line => line.toLowerCase().includes('error'))
          : [];
        resolve({
          exitCode: error ? error.code || 1 : 0,
          errors,
        });
      }
    );
  });
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

main();
