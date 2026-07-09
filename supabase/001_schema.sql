-- Paycheck Predictor - Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 2. Fortnights
CREATE TABLE fortnights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  accommodation_amount DECIMAL(10,2) NOT NULL DEFAULT 314.02,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_fortnight UNIQUE (user_id, start_date),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

CREATE INDEX idx_fortnights_user_id ON fortnights(user_id);
CREATE INDEX idx_fortnights_dates ON fortnights(start_date, end_date);

ALTER TABLE fortnights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fortnights"
  ON fortnights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fortnights"
  ON fortnights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fortnights"
  ON fortnights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fortnights"
  ON fortnights FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fortnight_id UUID NOT NULL REFERENCES fortnights(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  is_public_holiday BOOLEAN NOT NULL DEFAULT FALSE,
  start_1 TIME,
  end_1 TIME,
  break_start_1 TIME,
  break_end_1 TIME,
  start_2 TIME,
  end_2 TIME,
  break_start_2 TIME,
  break_end_2 TIME,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_shift UNIQUE (user_id, shift_date)
);

CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_fortnight_id ON shifts(fortnight_id);
CREATE INDEX idx_shifts_date ON shifts(shift_date);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts"
  ON shifts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shifts"
  ON shifts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shifts"
  ON shifts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shifts"
  ON shifts FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Pay rates (singleton table - one active row at a time)
CREATE TABLE pay_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL DEFAULT 'Food & Beverage Attendant',
  base_rate DECIMAL(10,2) NOT NULL DEFAULT 25.85,
  saturday_rate DECIMAL(10,2) NOT NULL DEFAULT 32.31,
  sunday_rate DECIMAL(10,2) NOT NULL DEFAULT 38.78,
  public_holiday_rate DECIMAL(10,2) NOT NULL DEFAULT 58.16,
  weekend_overtime_rate DECIMAL(10,2) NOT NULL DEFAULT 51.70,
  weekday_overtime_first2_rate DECIMAL(10,2) NOT NULL DEFAULT 38.78,
  weekday_overtime_thereafter_rate DECIMAL(10,2) NOT NULL DEFAULT 51.70,
  weekday_allowance_7pm_12am DECIMAL(10,2) NOT NULL DEFAULT 2.81,
  no_break_taken_rate DECIMAL(10,2) NOT NULL DEFAULT 6.47,
  broken_shift_up_to_3hr DECIMAL(10,2) NOT NULL DEFAULT 3.53,
  broken_shift_over_3hr DECIMAL(10,2) NOT NULL DEFAULT 5.34,
  public_holiday_overtime_rate DECIMAL(10,2) NOT NULL DEFAULT 58.16,
  overtime_threshold_hours DECIMAL(5,2) NOT NULL DEFAULT 7.60,
  saturday_ot_threshold_hours DECIMAL(5,2) NOT NULL DEFAULT 3.75,
  no_break_threshold_minutes INT NOT NULL DEFAULT 300,
  super_percent DECIMAL(5,2) NOT NULL DEFAULT 11.50,
  effective_from DATE NOT NULL DEFAULT '2026-04-27',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view pay rates"
  ON pay_rates FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "All authenticated users can insert pay rates"
  ON pay_rates FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Seed default pay rates
INSERT INTO pay_rates (role, base_rate, saturday_rate, sunday_rate, public_holiday_rate,
  weekend_overtime_rate, weekday_overtime_first2_rate, weekday_overtime_thereafter_rate,
  weekday_allowance_7pm_12am, no_break_taken_rate, broken_shift_up_to_3hr, broken_shift_over_3hr,
  public_holiday_overtime_rate, overtime_threshold_hours, saturday_ot_threshold_hours,
  no_break_threshold_minutes, super_percent, effective_from)
VALUES ('Food & Beverage Attendant', 25.85, 32.31, 38.78, 58.16,
  51.70, 38.78, 51.70, 2.81, 6.47, 3.53, 5.34, 58.16,
  7.60, 3.75, 300, 11.50, '2026-04-27');
