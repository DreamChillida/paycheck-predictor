import type { ShiftEntry, PayRates, DayType, DayCalculation, FortnightCalculation } from '@/types';
import { DEFAULT_RATES, DEFAULT_ACCOMMODATION } from './rates';

function timeToMinutes(t: string | null): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function diffMinutes(start: string | null, end: string | null): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return Math.max(0, e - s);
}

function classifyDay(dateStr: string, isPublicHoliday: boolean): DayType {
  if (isPublicHoliday) return 'public_holiday';
  const d = new Date(dateStr);
  const day = d.getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
}

function calc7pmTo12amMinutes(start: string | null, end: string | null, netMinutes: number, rawMinutes: number): number {
  if (!start || !end) return 0;
  const s = timeToMinutes(start);
  let e = timeToMinutes(end);
  const sevenPm = 19 * 60;
  const midnight = 24 * 60;
  if (e > midnight) e = midnight;
  const overlap = Math.max(0, Math.min(e, midnight) - Math.max(s, sevenPm));
  if (overlap <= 0 || rawMinutes <= 0) return 0;
  return Math.round((overlap * netMinutes) / rawMinutes);
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSundayAfter(date: Date): Date {
  const d = getMonday(date);
  d.setDate(d.getDate() + 13);
  return d;
}

export function getFortnightRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr);
  const start = getMonday(date);
  const end = getSundayAfter(date);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function isDateInFortnight(dateStr: string, fortnightStart: string, fortnightEnd: string): boolean {
  return dateStr >= fortnightStart && dateStr <= fortnightEnd;
}

export function minutesToHours(m: number): number {
  return Math.round((m / 60) * 100) / 100;
}

export function hoursToMinutes(h: number): number {
  return Math.round(h * 60);
}

export function calculateSingleDay(
  shift: Pick<ShiftEntry, 'start_1' | 'end_1' | 'break_start_1' | 'break_end_1' | 'start_2' | 'end_2' | 'break_start_2' | 'break_end_2' | 'is_public_holiday'>,
  date: string,
  rates: PayRates = DEFAULT_RATES
): DayCalculation {
  const dayType = classifyDay(date, shift.is_public_holiday);
  const otThresholdMin = hoursToMinutes(rates.overtime_threshold_hours);
  const satOTThresholdMin = hoursToMinutes(rates.saturday_ot_threshold_hours);
  const noBreakThresholdMin = rates.no_break_threshold_minutes;

  const shifts = [
    { start: shift.start_1, end: shift.end_1, bStart: shift.break_start_1, bEnd: shift.break_end_1 },
    { start: shift.start_2, end: shift.end_2, bStart: shift.break_start_2, bEnd: shift.break_end_2 },
  ];

  let totalMinutes = 0;
  const shiftCalcs: { start: string; end: string; raw_minutes: number; break_minutes: number; net_minutes: number }[] = [];
  const shiftNoBreakMinutes: number[] = [];

  for (const s of shifts) {
    if (!s.start || !s.end) continue;
    const raw = diffMinutes(s.start, s.end);
    const brk = diffMinutes(s.bStart, s.bEnd);
    const net = raw - brk;
    if (net <= 0) continue;

    shiftCalcs.push({
      start: s.start,
      end: s.end,
      raw_minutes: raw,
      break_minutes: brk,
      net_minutes: net,
    });

    totalMinutes += net;

    if (raw >= noBreakThresholdMin && brk === 0) {
      shiftNoBreakMinutes.push(net);
    }
  }

  if (shiftCalcs.length === 0) {
    return {
      date,
      day_type: dayType,
      shifts: [],
      total_minutes: 0,
      ordinary_minutes: 0,
      saturday_minutes: 0,
      sunday_minutes: 0,
      public_holiday_minutes: 0,
      weekday_overtime_first2_minutes: 0,
      weekday_overtime_thereafter_minutes: 0,
      weekend_overtime_minutes: 0,
      public_holiday_overtime_minutes: 0,
      weekday_allowance_minutes: 0,
      no_break_taken_minutes: 0,
      broken_shift_up_to_3hr: false,
      broken_shift_over_3hr: false,
    };
  }

  // No Break Taken: only hours beyond threshold for qualified shifts
  let noBreakMinutes = 0;
  for (const sb of shiftNoBreakMinutes) {
    if (sb > noBreakThresholdMin) {
      noBreakMinutes += sb - noBreakThresholdMin;
    }
  }

  // Broken Shift Allowance
  let brokenUpTo3 = false;
  let brokenOver3 = false;
  if (shiftCalcs.length >= 2) {
    const gap = diffMinutes(shiftCalcs[0].end, shiftCalcs[1].start);
    if (gap > 180) {
      brokenOver3 = true;
    } else if (gap > 0) {
      brokenUpTo3 = true;
    }
  }

  // Weekday 7pm-12am allowance
  let weekdayAllowanceMinutes = 0;
  if (dayType === 'weekday') {
    for (const sc of shiftCalcs) {
      weekdayAllowanceMinutes += calc7pmTo12amMinutes(
        sc.start, sc.end, sc.net_minutes, sc.raw_minutes
      );
    }
  }

  let ordinaryMinutes = 0;
  let saturdayMinutes = 0;
  let sundayMinutes = 0;
  let phMinutes = 0;
  let weekdayOTFirst2 = 0;
  let weekdayOTThereafter = 0;
  let weekendOTMinutes = 0;
  let phOTMinutes = 0;

  const remaining = totalMinutes;

  if (dayType === 'saturday') {
    saturdayMinutes = Math.min(remaining, satOTThresholdMin);
    weekendOTMinutes = Math.max(0, remaining - satOTThresholdMin);
  } else if (dayType === 'sunday') {
    sundayMinutes = remaining;
  } else if (dayType === 'public_holiday') {
    phMinutes = Math.min(remaining, otThresholdMin);
    phOTMinutes = Math.max(0, remaining - otThresholdMin);
  } else {
    // weekday
    ordinaryMinutes = Math.min(remaining, otThresholdMin);
    const ot = Math.max(0, remaining - otThresholdMin);
    weekdayOTFirst2 = Math.min(ot, hoursToMinutes(2));
    weekdayOTThereafter = Math.max(0, ot - hoursToMinutes(2));
  }

  return {
    date,
    day_type: dayType,
    shifts: shiftCalcs,
    total_minutes: totalMinutes,
    ordinary_minutes: ordinaryMinutes,
    saturday_minutes: saturdayMinutes,
    sunday_minutes: sundayMinutes,
    public_holiday_minutes: phMinutes,
    weekday_overtime_first2_minutes: weekdayOTFirst2,
    weekday_overtime_thereafter_minutes: weekdayOTThereafter,
    weekend_overtime_minutes: weekendOTMinutes,
    public_holiday_overtime_minutes: phOTMinutes,
    weekday_allowance_minutes: weekdayAllowanceMinutes,
    no_break_taken_minutes: noBreakMinutes,
    broken_shift_up_to_3hr: brokenUpTo3,
    broken_shift_over_3hr: brokenOver3,
  };
}

function calculateTax(gross: number, isResident: boolean = true): number {
  if (!isResident || gross <= 0) return 0;

  const weekly = gross / 2;
  let taxWeekly = 0;

  // 2025-26 Australian tax rates (resident)
  if (weekly <= 350) {
    taxWeekly = 0;
  } else if (weekly <= 700) {
    taxWeekly = (weekly - 350) * 0.16;
  } else if (weekly <= 1050) {
    taxWeekly = 56 + (weekly - 700) * 0.30;
  } else if (weekly <= 1400) {
    taxWeekly = 161 + (weekly - 1050) * 0.37;
  } else {
    taxWeekly = 290.5 + (weekly - 1400) * 0.45;
  }

  return Math.round(Math.max(0, taxWeekly * 2));
}

export function calculateFortnight(
  shifts: Pick<ShiftEntry, 'id' | 'shift_date' | 'start_1' | 'end_1' | 'break_start_1' | 'break_end_1' | 'start_2' | 'end_2' | 'break_start_2' | 'break_end_2' | 'is_public_holiday'>[],
  fortnightId: string,
  startDate: string,
  endDate: string,
  rates: PayRates = DEFAULT_RATES,
  accommodationAmount: number = DEFAULT_ACCOMMODATION,
  tips: number = 0
): FortnightCalculation {
  const days: DayCalculation[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  const shiftMap = new Map<string, typeof shifts[0]>();
  for (const s of shifts) {
    shiftMap.set(s.shift_date, s);
  }

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const shift = shiftMap.get(dateStr);
    if (shift) {
      days.push(calculateSingleDay(shift, dateStr, rates));
    } else {
      days.push({
        date: dateStr,
        day_type: classifyDay(dateStr, false),
        shifts: [],
        total_minutes: 0,
        ordinary_minutes: 0,
        saturday_minutes: 0,
        sunday_minutes: 0,
        public_holiday_minutes: 0,
        weekday_overtime_first2_minutes: 0,
        weekday_overtime_thereafter_minutes: 0,
        weekend_overtime_minutes: 0,
        public_holiday_overtime_minutes: 0,
        weekday_allowance_minutes: 0,
        no_break_taken_minutes: 0,
        broken_shift_up_to_3hr: false,
        broken_shift_over_3hr: false,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  const sum = (key: keyof DayCalculation) =>
    days.reduce((a, d) => a + (typeof d[key] === 'number' ? (d[key] as number) : 0), 0);

  const totalMinutes = sum('total_minutes');
  const ordinaryMinutes = sum('ordinary_minutes');
  const saturdayMinutes = sum('saturday_minutes');
  const sundayMinutes = sum('sunday_minutes');
  const phMinutes = sum('public_holiday_minutes');
  const weekdayOTFirst2 = sum('weekday_overtime_first2_minutes');
  const weekdayOTThereafter = sum('weekday_overtime_thereafter_minutes');
  const weekendOTMinutes = sum('weekend_overtime_minutes');
  const phOTMinutes = sum('public_holiday_overtime_minutes');
  const weekdayAllowanceMinutes = sum('weekday_allowance_minutes');
  const noBreakMinutes = sum('no_break_taken_minutes');

  const brokenUp = days.filter(d => d.broken_shift_up_to_3hr).length;
  const brokenOver = days.filter(d => d.broken_shift_over_3hr).length;

  const toHours = (m: number) => m / 60;

  const earnings =
    toHours(ordinaryMinutes) * rates.base_rate +
    toHours(saturdayMinutes) * rates.saturday_rate +
    toHours(sundayMinutes) * rates.sunday_rate +
    toHours(phMinutes) * rates.public_holiday_rate +
    toHours(weekdayOTFirst2) * rates.weekday_overtime_first2_rate +
    toHours(weekdayOTThereafter) * rates.weekday_overtime_thereafter_rate +
    toHours(weekendOTMinutes) * rates.weekend_overtime_rate +
    toHours(phOTMinutes) * rates.public_holiday_overtime_rate +
    toHours(weekdayAllowanceMinutes) * rates.weekday_allowance_7pm_12am +
    toHours(noBreakMinutes) * rates.no_break_taken_rate +
    brokenUp * rates.broken_shift_up_to_3hr +
    brokenOver * rates.broken_shift_over_3hr +
    tips;

  const gross = Math.round(earnings * 100) / 100;
  const tax = calculateTax(gross);
  const net = Math.round((gross - tax - accommodationAmount) * 100) / 100;
  const superContribution = Math.round(gross * (rates.super_percent / 100) * 100) / 100;

  return {
    fortnight_id: fortnightId,
    start_date: startDate,
    end_date: endDate,
    days,
    total_minutes: totalMinutes,
    ordinary_minutes: ordinaryMinutes,
    saturday_minutes: saturdayMinutes,
    sunday_minutes: sundayMinutes,
    public_holiday_minutes: phMinutes,
    weekday_overtime_first2_minutes: weekdayOTFirst2,
    weekday_overtime_thereafter_minutes: weekdayOTThereafter,
    weekend_overtime_minutes: weekendOTMinutes,
    public_holiday_overtime_minutes: phOTMinutes,
    weekday_allowance_units: weekdayAllowanceMinutes,
    no_break_taken_minutes: noBreakMinutes,
    broken_shift_up_to_3hr_count: brokenUp,
    broken_shift_over_3hr_count: brokenOver,
    tips,
    gross_earnings: gross,
    payg_tax: tax,
    accommodation_deduction: accommodationAmount,
    net_payment: net,
    super_contribution: superContribution,
  };
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h${min.toString().padStart(2, '0')}`;
}

export function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function getWeekdayAllowanceUnits(minutes: number, allowancePerUnit: number = 0.25): number {
  // Allowance typically paid in 15-min (0.25h) increments
  return Math.round(minutes / 15) * 0.25;
}
