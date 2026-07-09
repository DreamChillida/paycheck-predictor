'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { CalendarIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getFortnightRange, getMonday } from '@/lib/date-utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DEFAULT_ACCOMMODATION } from '@/lib/rates';

interface NewFortnightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFortnightDialog({ open, onOpenChange }: NewFortnightDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const { locale, t } = useLocale();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [creating, setCreating] = useState(false);

  const range = startDate ? getFortnightRange(format(startDate, 'yyyy-MM-dd')) : null;

  const daysInRange = range ? (() => {
    const days: Date[] = [];
    const current = new Date(range.start + 'T00:00:00');
    const end = new Date(range.end + 'T00:00:00');
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  })() : [];

  const handleCreate = async () => {
    if (!range || !selectedDay) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { data: existing } = await supabase
      .from('fortnights')
      .select('id')
      .eq('user_id', user.id)
      .eq('start_date', range.start)
      .single();

    if (existing) {
      router.push(`/shifts/new?fn_id=${existing.id}&date=${format(selectedDay, 'yyyy-MM-dd')}`);
      setCreating(false);
      onOpenChange(false);
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
      toast.error(error.message);
      setCreating(false);
      return;
    }

    router.push(`/shifts/new?fn_id=${fn.id}&date=${format(selectedDay, 'yyyy-MM-dd')}`);
    setCreating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.newFortnight.title}</DialogTitle>
          <DialogDescription>
            {t.newFortnight.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.newFortnight.pickStart}</label>
            <Popover>
              <PopoverTrigger className="w-full justify-start text-left font-normal flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {startDate ? format(startDate, 'EEEE, d MMM yyyy') : t.shiftForm.pickDate}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => { setStartDate(d ? getMonday(d) : undefined); setSelectedDay(undefined); }}
                  disabled={[{ dayOfWeek: [0, 2, 3, 4, 5, 6] }]}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
          </div>

          {range && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t.newFortnight.fortnightRange}: {new Date(range.start + 'T00:00:00').toLocaleDateString(locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'en-AU', { day: 'numeric', month: 'short' })} — {new Date(range.end + 'T00:00:00').toLocaleDateString(locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-muted-foreground">{t.newFortnight.selectDay}</p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {daysInRange.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isSelected = selectedDay && format(selectedDay, 'yyyy-MM-dd') === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`text-xs px-2 py-1.5 rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-accent border-border'
                      }`}
                    >
                      {format(day, 'd')}
                      <span className="block text-[10px] opacity-60">
                        {format(day, 'EEE')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!selectedDay || creating}
            onClick={handleCreate}
          >
            {creating ? t.newFortnight.creating : t.newFortnight.goToShift}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
