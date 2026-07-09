'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Pencil, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';
import { calculateFortnight, formatMinutes, formatCurrency, minutesToHours } from '@/lib/calculations';
import { DEFAULT_RATES, DEFAULT_ACCOMMODATION } from '@/lib/rates';
import { formatDateRange, getWeekdayAllowanceUnits } from '@/lib/date-utils';
import type { ShiftEntry, Fortnight as FortnightType, FortnightCalculation, PayRates, DayCalculation } from '@/types';

export default function FortnightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [fn, setFn] = useState<FortnightType | null>(null);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [calc, setCalc] = useState<FortnightCalculation | null>(null);
  const [rates, setRates] = useState<PayRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: fnData } = await supabase
      .from('fortnights')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!fnData) { router.push('/dashboard'); return; }
    setFn(fnData);

    const { data: ratesData } = await supabase
      .from('pay_rates')
      .select('*')
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();
    if (ratesData) setRates(ratesData);

    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('*')
      .eq('fortnight_id', params.id)
      .order('shift_date', { ascending: true });

    if (shiftsData) {
      setShifts(shiftsData);
      const result = calculateFortnight(
        shiftsData, fnData.id, fnData.start_date, fnData.end_date,
        ratesData || DEFAULT_RATES, fnData.accommodation_amount
      );
      setCalc(result);
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [params.id]);

  const deleteFortnight = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('fortnights').delete().eq('id', params.id);
    if (error) {
      toast.error('Failed to delete fortnight');
    } else {
      toast.success('Fortnight deleted');
      router.push('/dashboard');
    }
  }, [params.id, router]);

  const dayTypeColor = (dt: string) => {
    const map: Record<string, string> = {
      weekday: 'bg-blue-100 text-blue-800',
      saturday: 'bg-purple-100 text-purple-800',
      sunday: 'bg-orange-100 text-orange-800',
      public_holiday: 'bg-red-100 text-red-800',
    };
    return map[dt] || 'bg-gray-100 text-gray-800';
  };

  if (loading || !fn) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-3xl px-4 py-6 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const hasShifts = shifts.length > 0;
  const dayTypeTotals = calc ? calcDaysByType(calc) : {};

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-6 min-w-0 overflow-hidden">
        {/* Back + Title + Delete */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight break-words">{formatDateRange(fn.start_date, fn.end_date)}</h1>
            <p className="text-sm text-muted-foreground">
              {fn.is_closed ? 'Closed' : 'Active'} &middot; {shifts.length} days logged
            </p>
          </div>
          <Dialog>
            <DialogTrigger
              render={<Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive shrink-0 mt-0.5" />}
            >
              <Trash2 className="h-5 w-5" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Fortnight</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this fortnight and all its shifts? This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="destructive" onClick={deleteFortnight}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!hasShifts ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground">No shifts logged for this fortnight.</p>
              <Button onClick={() => router.push(`/shifts/new?fn_id=${fn.id}`)}>
                <Plus className="h-4 w-4 mr-2" /> Log First Shift
              </Button>
            </CardContent>
          </Card>
        ) : calc ? (
          <Tabs defaultValue="breakdown">
            <TabsList className="grid w-full grid-cols-3 min-w-0">
              <TabsTrigger value="breakdown" className="text-xs sm:text-sm min-w-0">Breakdown</TabsTrigger>
              <TabsTrigger value="days" className="text-xs sm:text-sm min-w-0">Daily Log</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs sm:text-sm min-w-0">Summary</TabsTrigger>
            </TabsList>

            {/* BREAKDOWN TAB */}
            <TabsContent value="breakdown" className="flex flex-col space-y-4 min-w-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hours Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <BreakdownRow
                    label="Total Hours"
                    value={formatMinutes(calc.total_minutes)}
                    bold
                  />
                  <Separator />
                  <BreakdownRow label="Ordinary Hours" value={formatMinutes(calc.ordinary_minutes)} rate={rates.base_rate} />
                  <BreakdownRow label="Saturday" value={formatMinutes(calc.saturday_minutes)} rate={rates.saturday_rate} />
                  <BreakdownRow label="Sunday" value={formatMinutes(calc.sunday_minutes)} rate={rates.sunday_rate} />
                  <BreakdownRow label="Public Holiday" value={formatMinutes(calc.public_holiday_minutes)} rate={rates.public_holiday_rate} />
                  {calc.weekday_overtime_first2_minutes > 0 && (
                    <BreakdownRow label="Weekday OT (First 2h)" value={formatMinutes(calc.weekday_overtime_first2_minutes)} rate={rates.weekday_overtime_first2_rate} />
                  )}
                  {calc.weekday_overtime_thereafter_minutes > 0 && (
                    <BreakdownRow label="Weekday OT (Thereafter)" value={formatMinutes(calc.weekday_overtime_thereafter_minutes)} rate={rates.weekday_overtime_thereafter_rate} />
                  )}
                  {calc.weekend_overtime_minutes > 0 && (
                    <BreakdownRow label="Weekend Overtime" value={formatMinutes(calc.weekend_overtime_minutes)} rate={rates.weekend_overtime_rate} />
                  )}
                  {calc.public_holiday_overtime_minutes > 0 && (
                    <BreakdownRow label="PH Overtime" value={formatMinutes(calc.public_holiday_overtime_minutes)} rate={rates.public_holiday_overtime_rate} />
                  )}
                  {calc.weekday_allowance_units > 0 && (
                    <BreakdownRow
                      label="Weekday 7pm-12am Allowance"
                      value={`${getWeekdayAllowanceUnits(calc.weekday_allowance_units)}h`}
                      rate={rates.weekday_allowance_7pm_12am}
                    />
                  )}
                  {calc.no_break_taken_minutes > 0 && (
                    <BreakdownRow label="No Break Taken" value={formatMinutes(calc.no_break_taken_minutes)} rate={rates.no_break_taken_rate} />
                  )}
                  {calc.broken_shift_up_to_3hr_count > 0 && (
                    <BreakdownRow label="Broken Shift (≤3h gap)" value={`${calc.broken_shift_up_to_3hr_count}×`} rate={rates.broken_shift_up_to_3hr} />
                  )}
                  {calc.broken_shift_over_3hr_count > 0 && (
                    <BreakdownRow label="Broken Shift (>3h gap)" value={`${calc.broken_shift_over_3hr_count}×`} rate={rates.broken_shift_over_3hr} />
                  )}
                  {calc.tips > 0 && (
                    <BreakdownRow label="Tips" value={formatCurrency(calc.tips)} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 min-w-0">
                  <div className="flex justify-between items-baseline gap-2 min-w-0">
                    <span className="font-bold break-words">Gross Earnings</span>
                    <span className="font-bold text-lg sm:text-xl tabular-nums shrink-0">{formatCurrency(calc.gross_earnings)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-2 text-sm text-muted-foreground min-w-0">
                    <span className="break-words">PAYG Tax</span>
                    <span className="tabular-nums shrink-0">-{formatCurrency(calc.payg_tax)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-sm text-muted-foreground min-w-0">
                    <span className="break-words">Accommodation</span>
                    <span className="tabular-nums shrink-0">-{formatCurrency(calc.accommodation_deduction)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-baseline gap-2 text-lg sm:text-xl font-bold text-green-600 min-w-0">
                    <span className="break-words">Net Payment</span>
                    <span className="tabular-nums shrink-0">{formatCurrency(calc.net_payment)}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-sm text-muted-foreground min-w-0">
                    <span className="break-words">Superannuation (SG)</span>
                    <span className="tabular-nums shrink-0">{formatCurrency(calc.super_contribution)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DAYS TAB */}
            <TabsContent value="days" className="space-y-3">
              {calc.days.filter(d => d.total_minutes > 0).map((day) => (
                <Card key={day.date} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <Badge className={`ml-2 ${dayTypeColor(day.day_type)}`}>
                          {day.day_type === 'public_holiday' ? 'PH' : day.day_type}
                        </Badge>
                      </div>
                      <span className="font-semibold">{formatMinutes(day.total_minutes)}</span>
                    </div>

                    {day.shifts.map((s, idx) => (
                      <div key={idx} className="text-xs sm:text-sm text-muted-foreground flex justify-between gap-2">
                        <span className="break-all min-w-0">
                          Shift {idx + 1}: {s.start}—{s.end}
                          {s.break_minutes > 0 && ` (brk: ${s.break_minutes}m)`}
                        </span>
                      </div>
                    ))}

                    {day.no_break_taken_minutes > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No break taken: +{formatMinutes(day.no_break_taken_minutes)} penalty
                      </p>
                    )}

                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => router.push(`/shifts/new?fn_id=${fn.id}&date=${day.date}`)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* SUMMARY TAB */}
            <TabsContent value="summary">
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <SummaryStat label="Total Hours" value={formatMinutes(calc.total_minutes)} />
                  <SummaryStat label="Ordinary" value={`${formatMinutes(calc.ordinary_minutes)} @ $${rates.base_rate}/h = ${formatCurrency(minutesToHours(calc.ordinary_minutes) * rates.base_rate)}`} />
                  <SummaryStat label="Saturday" value={`${formatMinutes(calc.saturday_minutes)} @ $${rates.saturday_rate}/h = ${formatCurrency(minutesToHours(calc.saturday_minutes) * rates.saturday_rate)}`} />
                  <SummaryStat label="Sunday" value={`${formatMinutes(calc.sunday_minutes)} @ $${rates.sunday_rate}/h = ${formatCurrency(minutesToHours(calc.sunday_minutes) * rates.sunday_rate)}`} />
                  <Separator />
                  <SummaryStat label="Effective Hourly Rate" value={calc.total_minutes > 0 ? formatCurrency(calc.gross_earnings / (calc.total_minutes / 60)) : '-'} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push(`/shifts/new?fn_id=${fn.id}`)}
          >
            <Plus className="h-4 w-4 mr-2 shrink-0" /> Add Shift
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => router.push('/settings')}>
            Adjust Rates
          </Button>
        </div>
      </main>
    </div>
  );
}

function BreakdownRow({ label, value, rate, bold }: { label: string; value: string; rate?: number; bold?: boolean }) {
  const numVal = parseFloat(value.replace(/[^0-9.]/g, ''));
  const total = rate && numVal ? (numVal / 60) * rate : rate && value.includes('×') ? rate * (parseInt(value) || 1) : undefined;

  return (
    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 min-w-0 ${bold ? 'text-base' : 'text-sm'}`}>
      <span className={`break-words ${bold ? 'font-bold' : ''}`}>{label}</span>
      <span className="sm:text-right break-words text-balance min-w-0">
        <span className={bold ? 'font-bold' : ''}>{value}</span>
        {rate && total !== undefined && (
          <span className="text-muted-foreground whitespace-nowrap">
            {' × '}${rate.toFixed(2)} = {formatCurrency(total)}
          </span>
        )}
      </span>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-balance">{value}</span>
    </div>
  );
}

function calcDaysByType(calc: FortnightCalculation) {
  const totals: Record<string, number> = {};
  for (const d of calc.days) {
    if (d.total_minutes > 0) {
      totals[d.day_type] = (totals[d.day_type] || 0) + d.total_minutes;
    }
  }
  return totals;
}
