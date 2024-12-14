export type BookStatus = 'Read' | 'Selected' | 'Candidate' | 'Relegated' | 'Available';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  pages?: number;
  status: BookStatus;
  pollCount: number;
  selectedForDate?: string;
  coverImage: string;
  goodreadsId?: string;
  createdAt?: string;
  updatedAt?: string;
  link?: string;
}