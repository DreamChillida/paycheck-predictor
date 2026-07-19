import type { DayType } from '@/types';
import { format } from 'date-fns';

export function classifyDay(date: Date, isPublicHoliday: boolean): DayType {
  if (isPublicHoliday) return 'public_holiday';
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
}

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getSundayAfter(date: Date): Date {
  const d = getMonday(date);
  d.setDate(d.getDate() + 13);
  return d;
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${s.toLocaleDateString('en-AU', opts)} — ${e.toLocaleDateString('en-AU', opts)}`;
}

export function getWeekdayAllowanceUnits(minutes: number): number {
  return Math.round(minutes / 15) * 0.25;
}

export function getFortnightRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr + 'T00:00:00');
  const start = getMonday(date);
  const end = getSundayAfter(date);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}
