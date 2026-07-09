'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/layout/Header';
import { DEFAULT_RATES } from '@/lib/rates';
import { toast } from 'sonner';
import type { PayRates } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<PayRates>(DEFAULT_RATES);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    const { data } = await supabase
      .from('pay_rates')
      .select('*')
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (data) setRates(data);
    setLoading(false);
  };

  const update = (key: keyof PayRates, value: string) => {
    const num = parseFloat(value);
    setRates((prev) => ({ ...prev, [key]: isNaN(num) ? value : num }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('pay_rates').insert({
      role: rates.role,
      base_rate: rates.base_rate,
      saturday_rate: rates.saturday_rate,
      sunday_rate: rates.sunday_rate,
      public_holiday_rate: rates.public_holiday_rate,
      weekend_overtime_rate: rates.weekend_overtime_rate,
      weekday_overtime_first2_rate: rates.weekday_overtime_first2_rate,
      weekday_overtime_thereafter_rate: rates.weekday_overtime_thereafter_rate,
      weekday_allowance_7pm_12am: rates.weekday_allowance_7pm_12am,
      no_break_taken_rate: rates.no_break_taken_rate,
      broken_shift_up_to_3hr: rates.broken_shift_up_to_3hr,
      broken_shift_over_3hr: rates.broken_shift_over_3hr,
      public_holiday_overtime_rate: rates.public_holiday_overtime_rate,
      overtime_threshold_hours: rates.overtime_threshold_hours,
      saturday_ot_threshold_hours: rates.saturday_ot_threshold_hours,
      no_break_threshold_minutes: rates.no_break_threshold_minutes,
      super_percent: rates.super_percent,
      effective_from: new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Rates updated');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-lg px-4 py-6 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Pay Rates & Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hourly Rates</CardTitle>
            <CardDescription>Configure the pay rates used for calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RateField label="Base Rate" value={rates.base_rate} onChange={(v) => update('base_rate', v)} prefix="$" />
            <RateField label="Saturday" value={rates.saturday_rate} onChange={(v) => update('saturday_rate', v)} prefix="$" />
            <RateField label="Sunday" value={rates.sunday_rate} onChange={(v) => update('sunday_rate', v)} prefix="$" />
            <RateField label="Public Holiday" value={rates.public_holiday_rate} onChange={(v) => update('public_holiday_rate', v)} prefix="$" />
            <RateField label="Weekend Overtime" value={rates.weekend_overtime_rate} onChange={(v) => update('weekend_overtime_rate', v)} prefix="$" />
            <RateField label="Weekday OT (First 2h)" value={rates.weekday_overtime_first2_rate} onChange={(v) => update('weekday_overtime_first2_rate', v)} prefix="$" />
            <RateField label="Weekday OT (Thereafter)" value={rates.weekday_overtime_thereafter_rate} onChange={(v) => update('weekday_overtime_thereafter_rate', v)} prefix="$" />
            <RateField label="Weekday 7pm-12am Allowance" value={rates.weekday_allowance_7pm_12am} onChange={(v) => update('weekday_allowance_7pm_12am', v)} prefix="$" />
            <RateField label="No Break Taken Penalty" value={rates.no_break_taken_rate} onChange={(v) => update('no_break_taken_rate', v)} prefix="$" />
            <RateField label="Broken Shift (≤3h gap)" value={rates.broken_shift_up_to_3hr} onChange={(v) => update('broken_shift_up_to_3hr', v)} prefix="$" />
            <RateField label="Broken Shift (>3h gap)" value={rates.broken_shift_over_3hr} onChange={(v) => update('broken_shift_over_3hr', v)} prefix="$" />
            <RateField label="PH Overtime" value={rates.public_holiday_overtime_rate} onChange={(v) => update('public_holiday_overtime_rate', v)} prefix="$" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thresholds & Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RateField label="Weekday OT Threshold (hours)" value={rates.overtime_threshold_hours} onChange={(v) => update('overtime_threshold_hours', v)} />
            <RateField label="Saturday OT Threshold (hours)" value={rates.saturday_ot_threshold_hours} onChange={(v) => update('saturday_ot_threshold_hours', v)} />
            <RateField label="No Break Threshold (minutes)" value={rates.no_break_threshold_minutes} onChange={(v) => update('no_break_threshold_minutes', v)} />
            <RateField label="Super Guarantee (%)" value={rates.super_percent} onChange={(v) => update('super_percent', v)} suffix="%" />
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </main>
    </div>
  );
}

function RateField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="flex-1 text-sm">{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          step="0.01"
          className="w-24 h-8 text-right"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
