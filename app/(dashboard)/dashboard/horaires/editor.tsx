'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveHoursAction } from './actions';
import type { OpeningHour } from '@/types/database';

const DAYS = [
  { num: 1, label: 'Lundi' },
  { num: 2, label: 'Mardi' },
  { num: 3, label: 'Mercredi' },
  { num: 4, label: 'Jeudi' },
  { num: 5, label: 'Vendredi' },
  { num: 6, label: 'Samedi' },
  { num: 7, label: 'Dimanche' },
] as const;

interface DayState {
  day_of_week: number;
  is_closed: boolean;
  opens_at: string;
  closes_at: string;
}

function fromHours(hours: OpeningHour[]): DayState[] {
  return DAYS.map((d) => {
    const existing = hours.find((h) => h.day_of_week === d.num);
    if (existing) {
      return {
        day_of_week: d.num,
        is_closed: false,
        opens_at: existing.opens_at.slice(0, 5),
        closes_at: existing.closes_at.slice(0, 5),
      };
    }
    // Aucune ligne pour ce jour = on considère fermé par défaut SI au moins une autre ligne existe.
    // Si aucun jour n'a d'horaire (table vide), on init à 11-22h ouvert pour tous les jours.
    const hasAny = hours.length > 0;
    return {
      day_of_week: d.num,
      is_closed: hasAny,
      opens_at: '11:00',
      closes_at: '22:00',
    };
  });
}

export function HoursEditor({ initialHours }: { initialHours: OpeningHour[] }) {
  const router = useRouter();
  const [days, setDays] = useState<DayState[]>(fromHours(initialHours));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateDay = (num: number, patch: Partial<DayState>) =>
    setDays((prev) => prev.map((d) => (d.day_of_week === num ? { ...d, ...patch } : d)));

  const applyToAll = () => {
    if (!confirm('Appliquer les horaires du lundi à tous les jours ?')) return;
    const mon = days.find((d) => d.day_of_week === 1)!;
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        is_closed: mon.is_closed,
        opens_at: mon.opens_at,
        closes_at: mon.closes_at,
      })),
    );
  };

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSuccess(false);
          fd.set('hours', JSON.stringify(days));
          const res = await saveHoursAction(fd);
          if (!res.ok) setError(res.error ?? 'Erreur');
          else {
            setSuccess(true);
            router.refresh();
          }
        })
      }
      className="space-y-4"
    >
      <div className="overflow-hidden rounded-xl border border-border">
        {days.map((d, idx) => {
          const label = DAYS.find((x) => x.num === d.day_of_week)!.label;
          return (
            <div
              key={d.day_of_week}
              className={
                'grid grid-cols-[100px_auto_1fr_1fr] items-center gap-3 px-4 py-3 ' +
                (idx < days.length - 1 ? 'border-b border-border ' : '') +
                (d.is_closed ? 'bg-muted/40' : 'bg-background')
              }
            >
              <span className="text-sm font-semibold">{label}</span>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!d.is_closed}
                  onChange={(e) => updateDay(d.day_of_week, { is_closed: !e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <span className={d.is_closed ? 'text-muted-foreground' : 'text-foreground'}>
                  {d.is_closed ? 'Fermé' : 'Ouvert'}
                </span>
              </label>
              <Input
                type="time"
                value={d.opens_at}
                onChange={(e) => updateDay(d.day_of_week, { opens_at: e.target.value })}
                disabled={d.is_closed}
                className="h-9"
              />
              <Input
                type="time"
                value={d.closes_at}
                onChange={(e) => updateDay(d.day_of_week, { closes_at: e.target.value })}
                disabled={d.is_closed}
                className="h-9"
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={applyToAll}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Appliquer Lundi à tous les jours
        </button>
        {success && <span className="text-xs text-success">✓ Horaires enregistrés</span>}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enregistrement…' : 'Enregistrer les horaires'}
      </Button>
    </form>
  );
}
