import type { Book } from '~/types/book';

export const statusColors: StatusColor = {
  Read: 'bg-green-100 text-green-800',
  Candidate: 'bg-yellow-100 text-yellow-800',
  Relegated: 'bg-red-100 text-red-800',
  Selected: 'bg-blue-100 text-blue-800'
};

export const getStatusColor = (status: keyof StatusColor): string => {
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export type StatusColor = {
  [key in Book['status']]: string;
};