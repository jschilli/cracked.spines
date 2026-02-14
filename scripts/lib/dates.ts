import { addMonths, format, getDay, setDate } from 'date-fns';

/**
 * Find the Nth occurrence of a weekday in a given month.
 * weekday: 0=Sunday, 1=Monday, ..., 4=Thursday, 5=Friday, 6=Saturday
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  // Start at the 1st of the month
  const firstOfMonth = new Date(year, month, 1);
  const firstDow = getDay(firstOfMonth);

  // Days until the first occurrence of the target weekday
  let daysUntil = weekday - firstDow;
  if (daysUntil < 0) daysUntil += 7;

  // First occurrence is on day (1 + daysUntil), nth is + (n-1)*7
  const day = 1 + daysUntil + (n - 1) * 7;
  return new Date(year, month, day);
}

/** 3rd Thursday of the given month (month is 0-indexed) */
export function getThirdThursdayOfMonth(year: number, month: number): Date {
  return getNthWeekdayOfMonth(year, month, 4, 3);
}

/** 2nd Friday of the given month (month is 0-indexed) */
export function getSecondFridayOfMonth(year: number, month: number): Date {
  return getNthWeekdayOfMonth(year, month, 5, 2);
}

/** 2nd Thursday of the given month (month is 0-indexed) */
export function getSecondThursdayOfMonth(year: number, month: number): Date {
  return getNthWeekdayOfMonth(year, month, 4, 2);
}

/**
 * Calculate the next selection date based on currently selected books.
 * Finds the latest selectedForDate, then computes the 3rd Thursday of the following month.
 * If no selected books exist, uses 3rd Thursday 3 months from today.
 * Returns { date, warnings }.
 */
export function calculateNextSelectionDate(
  currentSelectedDates: string[]
): { date: string; warnings: string[] } {
  const warnings: string[] = [];

  let targetDate: Date;

  if (currentSelectedDates.length === 0) {
    // No selected books — use 3rd Thursday 3 months from now
    const future = addMonths(new Date(), 3);
    targetDate = getThirdThursdayOfMonth(future.getFullYear(), future.getMonth());
  } else {
    // Find the latest selectedForDate
    const sorted = [...currentSelectedDates].sort();
    const latest = sorted[sorted.length - 1];
    const latestDate = new Date(latest + 'T00:00:00');

    // Next month after the latest
    const nextMonth = addMonths(latestDate, 1);
    targetDate = getThirdThursdayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth());
  }

  const dateStr = format(targetDate, 'yyyy-MM-dd');

  // Warn if in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (targetDate < today) {
    warnings.push(`Calculated selectedForDate ${dateStr} is in the past`);
  }

  return { date: dateStr, warnings };
}
