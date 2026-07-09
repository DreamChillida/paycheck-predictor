'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { calculateFortnight, getFortnightRange, minutesToHours, formatMinutes, formatCurrency } from '@/lib/calculations';
import { DEFAULT_RATES, DEFAULT_ACCOMMODATION } from '@/lib/rates';
import type { ShiftEntry, Fortnight as FortnightType, FortnightCalculation, PayRates } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [fortnights, setFortnights] = useState<(FortnightType & { calc: FortnightCalculation | null })[]>([]);
  const [rates, setRates] = useState<PayRates>(DEFAULT_RATES);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: ratesData } = await supabase
      .from('pay_rates')
      .select('*')
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (ratesData) setRates(ratesData);

    const { data: fns } = await supabase
      .from('fortnights')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (!fns) {
      setLoading(false);
      return;
    }

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

        return { ...fn, calc };
      })
    );

    setFortnights(enriched);
    setLoading(false);
  };

  const createNewFortnight = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const range = getFortnightRange(today);

    const { data: existing } = await supabase
      .from('fortnights')
      .select('id')
      .eq('user_id', user.id)
      .eq('start_date', range.start)
      .single();

    if (existing) {
      router.push(`/shifts/new?fn_id=${existing.id}`);
      return;
    }

    const { data: fn, error } = await supabase
      .from('fortnights')
      .insert({
        user_id: user.id,
        start_date: range.start,
        end_date: range.end,
        accommodation_amount: DEFAULT_ACCOMMODATION,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    router.push(`/shifts/new?fn_id=${fn.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">My Fortnights</h1>
          <Button onClick={createNewFortnight} className="shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Fortnight</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : fortnights.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Clock className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                No fortnights yet. Create your first one to start logging shifts.
              </p>
              <Button onClick={createNewFortnight}>
                <Plus className="h-4 w-4 mr-2" />
                Start First Fortnight
              </Button>
            </CardContent>
          </Card>
        ) : (
          fortnights.map((fn) => (
            <Card
              key={fn.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/fortnights/${fn.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {new Date(fn.start_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' — '}
                    {new Date(fn.end_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {fn.calc ? (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Hours</p>
                      <p className="font-semibold">{formatMinutes(fn.calc.total_minutes)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gross</p>
                      <p className="font-semibold">{formatCurrency(fn.calc.gross_earnings)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net</p>
                      <p className="font-semibold">{formatCurrency(fn.calc.net_payment)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No shifts logged yet</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
