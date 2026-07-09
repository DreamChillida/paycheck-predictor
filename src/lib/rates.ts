import type { PayRates } from '@/types';

export const DEFAULT_RATES: PayRates = {
  role: 'Food & Beverage Attendant',
  base_rate: 25.85,
  saturday_rate: 32.31,
  sunday_rate: 38.78,
  public_holiday_rate: 58.16,
  weekend_overtime_rate: 51.70,
  weekday_overtime_first2_rate: 38.78,
  weekday_overtime_thereafter_rate: 51.70,
  weekday_allowance_7pm_12am: 2.81,
  no_break_taken_rate: 6.47,
  broken_shift_up_to_3hr: 3.53,
  broken_shift_over_3hr: 5.34,
  public_holiday_overtime_rate: 58.16,
  overtime_threshold_hours: 7.6,
  saturday_ot_threshold_hours: 3.75,
  no_break_threshold_minutes: 300,
  super_percent: 11.5,
  effective_from: '2026-04-27',
};

export const DEFAULT_ACCOMMODATION = 314.02;
