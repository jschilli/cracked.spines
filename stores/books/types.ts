import { z } from 'zod';
import type { Book, BookStatus } from '~/types/book';

export const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  pages: z.number().positive(),
  coverImage: z.string().url(),
  status: z.enum(['Selected', 'Candidate', 'Relegated', 'Read']),
  selectedForDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type UpdateBookStatusPayload = {
  bookId: string;
  newStatus: BookStatus;
  selectedForDate?: Date;
};