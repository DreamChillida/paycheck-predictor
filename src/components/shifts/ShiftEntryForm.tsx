'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Moon, Sun, Briefcase, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import type { ShiftFormData, DayType } from '@/types';
import { classifyDay } from '@/lib/date-utils';

interface ShiftEntryFormProps {
  initialData?: Partial<ShiftFormData>;
  onSubmit: (data: ShiftFormData) => Promise<void>;
  onCancel?: () => void;
  fortnightRange?: { start: string; end: string };
}

export function ShiftEntryForm({ initialData, onSubmit, onCancel, fortnightRange }: ShiftEntryFormProps) {
  const [date, setDate] = useState<Date | undefined>(
    initialData?.shift_date ? new Date(initialData.shift_date + 'T00:00:00') : undefined
  );
  const [isPH, setIsPH] = useState(initialData?.is_public_holiday ?? false);
  const [hasShift2, setHasShift2] = useState(!!initialData?.start_2);
  const [submitting, setSubmitting] = useState(false);

  const [s1s, setS1s] = useState(initialData?.start_1 ?? '');
  const [s1e, setS1e] = useState(initialData?.end_1 ?? '');
  const [s1bs, setS1bs] = useState(initialData?.break_start_1 ?? '');
  const [s1be, setS1be] = useState(initialData?.break_end_1 ?? '');

  const [s2s, setS2s] = useState(initialData?.start_2 ?? '');
  const [s2e, setS2e] = useState(initialData?.end_2 ?? '');
  const [s2bs, setS2bs] = useState(initialData?.break_start_2 ?? '');
  const [s2be, setS2be] = useState(initialData?.break_end_2 ?? '');

  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const dayType: DayType | null = date ? classifyDay(date, isPH) : null;

  const dayTypeLabel = {
    weekday: 'Weekday',
    saturday: 'Saturday',
    sunday: 'Sunday',
    public_holiday: 'Public Holiday',
  };

  const dayTypeColor = {
    weekday: 'bg-blue-100 text-blue-800' as const,
    saturday: 'bg-purple-100 text-purple-800' as const,
    sunday: 'bg-orange-100 text-orange-800' as const,
    public_holiday: 'bg-red-100 text-red-800' as const,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setSubmitting(true);
    await onSubmit({
      shift_date: format(date, 'yyyy-MM-dd'),
      is_public_holiday: isPH,
      start_1: s1s,
      end_1: s1e,
      break_start_1: s1bs,
      break_end_1: s1be,
      start_2: s2s,
      end_2: s2e,
      break_start_2: s2bs,
      break_end_2: s2be,
      notes,
    });
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date & PH Toggle */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger className="w-full justify-start text-left font-normal flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {date ? format(date, 'EEEE, d MMM yyyy') : <span>Pick a date</span>}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={fortnightRange ? [
                      { before: new Date(fortnightRange.start + 'T00:00:00') },
                      { after: new Date(fortnightRange.end + 'T00:00:00') },
                    ] : undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              type="button"
              variant={isPH ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsPH(!isPH)}
              className="gap-2 w-full sm:w-auto"
            >
              <Briefcase className="h-4 w-4 shrink-0" />
              {isPH ? 'Public Holiday' : 'Mark as PH'}
            </Button>
          </div>

          {dayType && (
            <Badge className={dayTypeColor[dayType]}>
              {dayTypeLabel[dayType]}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Shift 1 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Shift 1</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="s1s" className="text-xs sm:text-sm leading-tight">Starting Hour</Label>
              <Input
                id="s1s"
                type="time"
                value={s1s}
                onChange={(e) => setS1s(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="s1e" className="text-xs sm:text-sm leading-tight">Finish Hour</Label>
              <Input
                id="s1e"
                type="time"
                value={s1e}
                onChange={(e) => setS1e(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {/* Break 1 */}
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Break (optional)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s1bs" className="text-xs sm:text-sm">Break Start</Label>
              <Input
                id="s1bs"
                type="time"
                value={s1bs}
                onChange={(e) => setS1bs(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s1be" className="text-xs sm:text-sm">Break Finish</Label>
              <Input
                id="s1be"
                type="time"
                value={s1be}
                onChange={(e) => setS1be(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift 2 Toggle */}
      {!hasShift2 ? (
        <Button type="button" variant="outline" className="w-full" onClick={() => setHasShift2(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Split Shift
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Shift 2</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHasShift2(false)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s2s" className="text-xs sm:text-sm">Starting Hour</Label>
                <Input
                  id="s2s"
                  type="time"
                  value={s2s}
                  onChange={(e) => setS2s(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s2e" className="text-xs sm:text-sm">Finish Hour</Label>
                <Input
                  id="s2e"
                  type="time"
                  value={s2e}
                  onChange={(e) => setS2e(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Break (optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s2bs" className="text-xs sm:text-sm">Break Start</Label>
                <Input
                  id="s2bs"
                  type="time"
                  value={s2bs}
                  onChange={(e) => setS2bs(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s2be" className="text-xs sm:text-sm">Break Finish</Label>
                <Input
                  id="s2be"
                  type="time"
                  value={s2be}
                  onChange={(e) => setS2be(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this shift..."
        />
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-4">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={submitting || !date}>
          {submitting ? 'Saving...' : 'Save Shift'}
        </Button>
      </div>
    </form>
  );
}
