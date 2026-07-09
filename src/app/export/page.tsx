'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatCurrency, calculateFortnight, formatMinutes } from '@/lib/calculations';
import { DEFAULT_RATES } from '@/lib/rates';
import type { Fortnight, ShiftEntry, FortnightCalculation } from '@/types';

export default function ExportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [fortnights, setFortnights] = useState<{ fn: Fortnight; calc: FortnightCalculation }[]>([]);

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
      .order('start_date', { ascending: false });

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

    setFortnights(enriched.filter(Boolean) as { fn: Fortnight; calc: FortnightCalculation }[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const exportCSV = () => {
    if (fortnights.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Fortnight Start', 'Fortnight End',
      'Total Hours', 'Ordinary Hours', 'Saturday Hours', 'Sunday Hours', 'PH Hours',
      'Weekday OT (First 2h)', 'Weekday OT (Thereafter)', 'Weekend OT', 'PH OT',
      'Gross Earnings', 'PAYG Tax', 'Accommodation', 'Net Payment', 'Super',
    ];

    const rows = fortnights.map((h) => [
      h.fn.start_date, h.fn.end_date,
      formatMinutes(h.calc.total_minutes),
      formatMinutes(h.calc.ordinary_minutes),
      formatMinutes(h.calc.saturday_minutes),
      formatMinutes(h.calc.sunday_minutes),
      formatMinutes(h.calc.public_holiday_minutes),
      formatMinutes(h.calc.weekday_overtime_first2_minutes),
      formatMinutes(h.calc.weekday_overtime_thereafter_minutes),
      formatMinutes(h.calc.weekend_overtime_minutes),
      formatMinutes(h.calc.public_holiday_overtime_minutes),
      formatCurrency(h.calc.gross_earnings),
      formatCurrency(h.calc.payg_tax),
      formatCurrency(h.calc.accommodation_deduction),
      formatCurrency(h.calc.net_payment),
      formatCurrency(h.calc.super_contribution),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paycheck-history.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const exportPDF = async () => {
    toast.info('PDF export coming soon');
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
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">Export Data</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>
              {fortnights.length > 0
                ? `${fortnights.length} fortnights available for export`
                : 'No data to export yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={exportCSV}
              disabled={fortnights.length === 0}
            >
              <Table className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="font-medium">Export as CSV</p>
                <p className="text-xs text-muted-foreground">Open in Excel, Google Sheets, or any spreadsheet app</p>
              </div>
              <Download className="h-4 w-4 ml-auto shrink-0" />
            </Button>

            <Separator />

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={exportPDF}
              disabled={fortnights.length === 0}
            >
              <FileText className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="font-medium">Export as PDF</p>
                <p className="text-xs text-muted-foreground">Printable report with full breakdown</p>
              </div>
              <Download className="h-4 w-4 ml-auto shrink-0" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
