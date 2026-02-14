import { z } from 'zod';

export const bookStatusSchema = z.enum(['Read', 'Selected', 'Candidate', 'Relegated']);

export const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  isbn: z.string().optional(),
  status: bookStatusSchema,
  selectedForDate: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  coverImage: z.string().nullable(),
  pages: z.number().optional(),
  goodreadsId: z.string().optional(),
  link: z.string(),
  pollCount: z.number(),
});

export const booksArraySchema = z.array(bookSchema);

export const scrapeDataSchema = z.object({
  title: z.string(),
  author: z.string(),
  isbn: z.string().nullable(),
  pages: z.number().nullable(),
  goodreadsId: z.string().nullable(),
  link: z.string(),
  coverImagePath: z.string().nullable(),
});

export const pollResultsInputSchema = z.object({
  rankedTitles: z.array(z.string()).min(1),
  booksJsonPath: z.string(),
});
