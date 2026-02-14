import { scrapeGoodreads } from './lib/goodreads.js';
import { success, failure, outputResult } from './lib/result.js';

async function main() {
  const url = process.argv[2];
  const imageDir = process.argv[3];

  if (!url || !imageDir) {
    outputResult(failure('Usage: scrape-goodreads <goodreads-url> <image-output-directory>'));
    return;
  }

  try {
    const { data, warnings } = await scrapeGoodreads(url, imageDir);
    outputResult(success(data, warnings));
  } catch (err) {
    outputResult(failure((err as Error).message));
  }
}

main();
