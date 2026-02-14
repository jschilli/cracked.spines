import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { ScrapeData } from './types.js';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&#60;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#62;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractGoodreadsId(url: string): string | null {
  const match = url.match(/\/show\/(\d+)/);
  return match ? match[1] : null;
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const match = html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractOgImage(html: string): string | null {
  const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (match) return match[1];
  // Try alternate attribute order
  const alt = html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/);
  return alt ? alt[1] : null;
}

export async function scrapeGoodreads(
  url: string,
  imageOutputDir: string
): Promise<{ data: ScrapeData; warnings: string[] }> {
  const warnings: string[] = [];

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Goodreads returned ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  // Parse JSON-LD
  const jsonLd = extractJsonLd(html);
  if (!jsonLd) {
    throw new Error('No JSON-LD data found on the Goodreads page');
  }

  // Title
  const rawTitle = (jsonLd.name as string) || '';
  const title = decodeHtmlEntities(rawTitle);

  // Author — can be object or array
  let author = '';
  const authorData = jsonLd.author;
  if (Array.isArray(authorData)) {
    author = (authorData[0] as { name?: string })?.name || '';
    if (authorData.length > 1) {
      const others = authorData.slice(1).map((a: { name?: string }) => a.name).filter(Boolean);
      warnings.push(`Multiple authors found. Using "${author}". Others: ${others.join(', ')}`);
    }
  } else if (authorData && typeof authorData === 'object') {
    author = (authorData as { name?: string }).name || '';
  }

  // ISBN
  const isbn = (jsonLd.isbn as string) || null;
  if (!isbn) {
    warnings.push('No ISBN found for this edition');
  }

  // Pages
  const rawPages = jsonLd.numberOfPages;
  const pages = rawPages ? Number(rawPages) : null;

  // Goodreads ID
  const goodreadsId = extractGoodreadsId(url);

  // Cover image
  const ogImage = extractOgImage(html);
  let coverImagePath: string | null = null;

  if (ogImage) {
    try {
      const imageFilename = (isbn || goodreadsId || 'unknown') + '.jpg';
      const outputPath = join(imageOutputDir, imageFilename);
      await mkdir(dirname(outputPath), { recursive: true });

      const imgResponse = await fetch(ogImage);
      if (imgResponse.ok) {
        const arrayBuf = await imgResponse.arrayBuffer();
        await writeFile(outputPath, Buffer.from(arrayBuf));
        coverImagePath = outputPath;
      } else {
        warnings.push(`Cover image download failed: ${imgResponse.status}`);
      }
    } catch (err) {
      warnings.push(`Cover image download error: ${(err as Error).message}`);
    }
  } else {
    warnings.push('No og:image found on the Goodreads page');
  }

  return {
    data: {
      title,
      author,
      isbn,
      pages,
      goodreadsId,
      link: url,
      coverImagePath,
    },
    warnings,
  };
}
