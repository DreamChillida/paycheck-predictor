export type DayType = 'weekday' | 'saturday' | 'sunday' | 'public_holiday';

export interface ShiftEntry {
  id: string;
  user_id: string;
  fortnight_id: string;
  shift_date: string;
  day_type: DayType;
  is_public_holiday: boolean;
  start_1: string | null;
  end_1: string | null;
  break_start_1: string | null;
  break_end_1: string | null;
  start_2: string | null;
  end_2: string | null;
  break_start_2: string | null;
  break_end_2: string | null;
  notes: string | null;
  created_at: string;
}

export interface ShiftFormData {
  shift_date: string;
  is_public_holiday: boolean;
  start_1: string;
  end_1: string;
  break_start_1: string;
  break_end_1: string;
  start_2: string;
  end_2: string;
  break_start_2: string;
  break_end_2: string;
  notes: string;
}

export interface Fortnight {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  accommodation_amount: number;
  is_closed: boolean;
  created_at: string;
}

export interface PayRates {
  id?: string;
  role: string;
  base_rate: number;
  saturday_rate: number;
  sunday_rate: number;
  public_holiday_rate: number;
  weekend_overtime_rate: number;
  weekday_overtime_first2_rate: number;
  weekday_overtime_thereafter_rate: number;
  weekday_allowance_7pm_12am: number;
  no_break_taken_rate: number;
  broken_shift_up_to_3hr: number;
  broken_shift_over_3hr: number;
  public_holiday_overtime_rate: number;
  overtime_threshold_hours: number;
  saturday_ot_threshold_hours: number;
  no_break_threshold_minutes: number;
  super_percent: number;
  effective_from: string;
}

export interface ShiftCalculation {
  start: string;
  end: string;
  raw_minutes: number;
  break_minutes: number;
  net_minutes: number;
}

export interface DayCalculation {
  date: string;
  day_type: DayType;
  shifts: ShiftCalculation[];
  total_minutes: number;
  ordinary_minutes: number;
  saturday_minutes: number;
  sunday_minutes: number;
  public_holiday_minutes: number;
  weekday_overtime_first2_minutes: number;
  weekday_overtime_thereafter_minutes: number;
  weekend_overtime_minutes: number;
  public_holiday_overtime_minutes: number;
  weekday_allowance_minutes: number;
  no_break_taken_minutes: number;
  broken_shift_up_to_3hr: boolean;
  broken_shift_over_3hr: boolean;
}

export interface FortnightCalculation {
  fortnight_id: string;
  start_date: string;
  end_date: string;
  days: DayCalculation[];
  total_minutes: number;
  ordinary_minutes: number;
  saturday_minutes: number;
  sunday_minutes: number;
  public_holiday_minutes: number;
  weekday_overtime_first2_minutes: number;
  weekday_overtime_thereafter_minutes: number;
  weekend_overtime_minutes: number;
  public_holiday_overtime_minutes: number;
  weekday_allowance_units: number;
  no_break_taken_minutes: number;
  broken_shift_up_to_3hr_count: number;
  broken_shift_over_3hr_count: number;
  tips: number;
  gross_earnings: number;
  payg_tax: number;
  accommodation_deduction: number;
  net_payment: number;
  super_contribution: number;
}
