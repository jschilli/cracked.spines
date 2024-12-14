import type { BookStatus } from '~/types/book';

export const getStatusClass = (status: BookStatus): string => {
  const classes = {
    Selected: 'bg-green-100 text-green-800',
    Candidate: 'bg-blue-100 text-blue-800',
    Relegated: 'bg-red-100 text-red-800',
    Read: 'bg-gray-100 text-gray-800'
  };
  return classes[status] || '';
};

export const VALID_STATUSES: BookStatus[] = ['Selected', 'Candidate', 'Relegated', 'Read'];