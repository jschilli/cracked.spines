import type { BookStatus } from '~/types/book';
import { VALID_STATUSES } from '~/utils/status';

export const useBookStatus = () => {
  const validateStatus = (status: string): BookStatus => {
    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    if (VALID_STATUSES.includes(normalizedStatus as BookStatus)) {
      return normalizedStatus as BookStatus;
    }
    throw new Error(`Invalid status: ${status}`);
  };

  return {
    validateStatus,
    VALID_STATUSES
  };
};