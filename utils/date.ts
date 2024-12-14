import { format, isBefore } from 'date-fns';

export const formatDisplayDate = (date: Date): string => {
  return format(new Date(date), 'MMMM d, yyyy');
};

export const isDatePassed = (date: Date): boolean => {
  return isBefore(new Date(date), new Date());
};