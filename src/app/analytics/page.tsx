'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';
import { formatCurrency, calculateFortnight } from '@/lib/calculations';
import { DEFAULT_RATES } from '@/lib/rates';
import type { Fortnight, ShiftEntry, FortnightCalculation } from '@/types';

const COLORS = ['#2563eb', '#9333ea', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899'];

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<{ fn: Fortnight; calc: FortnightCalculation }[]>([]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: ratesData } = await supabase
      .from('pay_rates')
      .select('*')
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();
    const rates = ratesData || DEFAULT_RATES;

    const { data: fns } = await supabase
      .from('fortnights')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });

    if (!fns) { setLoading(false); return; }

    const enriched = await Promise.all(
      fns.map(async (fn) => {
        const { data: shifts } = await supabase
          .from('shifts')
          .select('*')
          .eq('fortnight_id', fn.id)
          .order('shift_date', { ascending: true });
        const calc = shifts && shifts.length > 0
          ? calculateFortnight(shifts, fn.id, fn.start_date, fn.end_date, rates, fn.accommodation_amount)
          : null;
        return calc ? { fn, calc } : null;
      })
    );

    setHistory(enriched.filter(Boolean) as { fn: Fortnight; calc: FortnightCalculation }[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-4xl px-4 py-6 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Complete at least one fortnight to see analytics.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const lastCalc = history[history.length - 1].calc;

  const trendData = history.map((h) => ({
    label: new Date(h.fn.start_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    gross: h.calc.gross_earnings,
    net: h.calc.net_payment,
    hours: Math.round(h.calc.total_minutes / 60 * 10) / 10,
  }));

  const breakdownData = [
    { name: 'Ordinary', hours: lastCalc.ordinary_minutes / 60 },
    { name: 'Saturday', hours: lastCalc.saturday_minutes / 60 },
    { name: 'Sunday', hours: lastCalc.sunday_minutes / 60 },
    { name: 'PH', hours: lastCalc.public_holiday_minutes / 60 },
    { name: 'OT', hours: (lastCalc.weekday_overtime_first2_minutes + lastCalc.weekday_overtime_thereafter_minutes + lastCalc.weekend_overtime_minutes + lastCalc.public_holiday_overtime_minutes) / 60 },
  ].filter(d => d.hours > 0);

  const dayTypeCounts = history.reduce((acc, h) => {
    for (const d of h.calc.days) {
      if (d.total_minutes > 0) {
        acc[d.day_type] = (acc[d.day_type] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const dayTypeData = Object.entries(dayTypeCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Analytics</h1>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Avg Gross
                  </p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums">
                    {formatCurrency(history.reduce((s, h) => s + h.calc.gross_earnings, 0) / history.length)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Avg Net
                  </p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums">
                    {formatCurrency(history.reduce((s, h) => s + h.calc.net_payment, 0) / history.length)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Avg Hours
                  </p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums">
                    {Math.round(history.reduce((s, h) => s + h.calc.total_minutes, 0) / history.length / 6) / 10}h
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Fortnights
                  </p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums">{history.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gross vs Net Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="gross" stroke="#2563eb" name="Gross" strokeWidth={2} />
                    <Line type="monotone" dataKey="net" stroke="#10b981" name="Net" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hours per Fortnight</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#2563eb" radius={[4, 4, 0, 0]} name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Latest Fortnight Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdownData}
                        dataKey="hours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.name}: ${(entry.value as number).toFixed(1)}h`}
                      >
                        {breakdownData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Day Type Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dayTypeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {dayTypeData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
