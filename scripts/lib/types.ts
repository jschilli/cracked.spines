export type BookStatus = 'Read' | 'Selected' | 'Candidate' | 'Relegated';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  status: BookStatus;
  selectedForDate?: string | null;
  createdAt: string;
  updatedAt: string;
  coverImage: string | null;
  pages?: number;
  goodreadsId?: string;
  link: string;
  pollCount: number;
}

export interface ScriptResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

export interface ScrapeData {
  title: string;
  author: string;
  isbn: string | null;
  pages: number | null;
  goodreadsId: string | null;
  link: string;
  coverImagePath: string | null;
}

export interface PollResultsInput {
  rankedTitles: string[];
  booksJsonPath: string;
}

export interface PollResultsOutput {
  markedAsRead: { title: string } | null;
  selected: { title: string; selectedForDate: string };
  survived: string[];
  relegated: string[];
}

export interface DiffReport {
  booksAdded: { title: string; status: string; hasAllFields: boolean }[];
  statusChanges: { title: string; from: string; to: string }[];
  pollCountChanges: { title: string; from: number; to: number }[];
  selectedForDateChanges: { title: string; date: string | null }[];
  otherFieldChanges: { title: string; field: string; from: unknown; to: unknown }[];
  totalBooksBefore: number;
  totalBooksAfter: number;
  newImageFiles: string[];
  stagedImageFiles: string[];
}

export interface VerifySiteResult {
  jsonValid: boolean;
  schemaErrors: string[];
  missingImages: string[];
  buildExitCode: number;
  buildErrors: string[];
}
