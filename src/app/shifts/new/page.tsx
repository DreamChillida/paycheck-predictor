'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ShiftEntryForm } from '@/components/shifts/ShiftEntryForm';
import { toast } from 'sonner';
import type { ShiftFormData, Fortnight } from '@/types';

export default function NewShiftPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><Header /><div className="container mx-auto max-w-lg px-4 py-6 text-center text-muted-foreground">Loading...</div></div>}>
      <NewShiftForm />
    </Suspense>
  );
}

function NewShiftForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [fortnight, setFortnight] = useState<Fortnight | null>(null);
  const [loading, setLoading] = useState(true);

  const fnId = searchParams.get('fn_id');
  const preselectedDate = searchParams.get('date');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      if (fnId) {
        const { data: fn, error } = await supabase
          .from('fortnights')
          .select('*')
          .eq('id', fnId)
          .single();

        if (error || !fn) {
          toast.error('Fortnight not found');
          router.push('/dashboard');
          return;
        }
        setFortnight(fn);
      }

      setLoading(false);
    };
    init();
  }, [fnId]);

  const handleSubmit = async (data: ShiftFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let targetFnId = fnId;

    // Auto-create fortnight if no fn_id provided
    if (!targetFnId) {
      const { start, end } = await getFortnightRangeForDate(supabase, data.shift_date);
      const { data: existingFn } = await supabase
        .from('fortnights')
        .select('id')
        .eq('user_id', user.id)
        .eq('start_date', start)
        .single();

      if (existingFn) {
        targetFnId = existingFn.id;
      } else {
        const { data: newFn, error: fnErr } = await supabase
          .from('fortnights')
          .insert({
            user_id: user.id,
            start_date: start,
            end_date: end,
            accommodation_amount: 314.02,
          })
          .select()
          .single();

        if (fnErr) {
          toast.error('Failed to create fortnight');
          return;
        }
        targetFnId = newFn.id;
      }
    }

    const { error } = await supabase.from('shifts').upsert(
      {
        user_id: user.id,
        fortnight_id: targetFnId,
        shift_date: data.shift_date,
        is_public_holiday: data.is_public_holiday,
        start_1: data.start_1 || null,
        end_1: data.end_1 || null,
        break_start_1: data.break_start_1 || null,
        break_end_1: data.break_end_1 || null,
        start_2: data.start_2 || null,
        end_2: data.end_2 || null,
        break_start_2: data.break_start_2 || null,
        break_end_2: data.break_end_2 || null,
        notes: data.notes || null,
      },
      { onConflict: 'user_id, shift_date' }
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Shift saved!');
    router.push(`/fortnights/${targetFnId}`);
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
      <main className="container mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">
          {fortnight ? `Log Shift for ${fortnight.start_date} — ${fortnight.end_date}` : 'New Shift'}
        </h1>
        <ShiftEntryForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          initialData={preselectedDate ? { shift_date: preselectedDate } : undefined}
        />
      </main>
    </div>
  );
}

async function getFortnightRangeForDate(supabase: ReturnType<typeof createClient>, dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 13);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
