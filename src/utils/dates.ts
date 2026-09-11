import { addDays, format, isValid, parse } from 'date-fns';

// ISP timestamps represent local calendar dates, not UTC instants.
export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|[ T])/.exec(value.trim());
  if (!match?.[1]) return null;
  const date = parse(match[1], 'yyyy-MM-dd', new Date(2000, 0, 1));
  return isValid(date) && format(date, 'yyyy-MM-dd') === match[1] ? date : null;
}

export function formatDate(value?: string | null): string {
  const date = value ? parseCalendarDate(value) : null;
  return date ? format(date, 'dd MMM yyyy') : '—';
}

export const today = () => format(new Date(), 'yyyy-MM-dd');
export const daysFromToday = (days: number) => format(addDays(new Date(), days), 'yyyy-MM-dd');
