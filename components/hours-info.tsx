import type { OpeningHour } from '@/types/database';

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;
const DAY_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

/** Convertit "HH:MM:SS" → "HHhMM" (français), ou "HHh" si MM=00. */
function fmt(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

interface Props {
  hours: OpeningHour[];
  compact?: boolean;
}

/**
 * Composant serveur affichant les horaires d'ouverture.
 * `compact=true` → liste compacte (utilisée dans la sidebar du hero).
 * `compact=false` → grille semaine complète.
 */
export function HoursInfo({ hours, compact }: Props) {
  if (hours.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucun horaire défini — le restaurant gère manuellement son ouverture.
      </p>
    );
  }

  // Group by day_of_week
  const byDay = new Map<number, OpeningHour[]>();
  hours.forEach((h) => {
    if (!byDay.has(h.day_of_week)) byDay.set(h.day_of_week, []);
    byDay.get(h.day_of_week)!.push(h);
  });

  const today = nowInAlgeria().dow;

  return (
    <ul className={compact ? 'space-y-0.5 text-xs' : 'divide-y divide-border'}>
      {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
        const isToday = dow === today;
        const slots = byDay.get(dow) ?? [];
        const closed = slots.length === 0;
        const label = compact ? DAY_NAMES[dow - 1] : DAY_FULL[dow - 1];
        return (
          <li
            key={dow}
            className={
              compact
                ? 'flex items-center justify-between gap-3 ' +
                  (isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')
                : 'flex items-center justify-between gap-3 py-2.5 text-sm ' +
                  (isToday ? 'font-semibold text-foreground' : 'text-muted-foreground')
            }
          >
            <span className="flex items-center gap-2">
              {label}
              {isToday && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                  Aujourd&apos;hui
                </span>
              )}
            </span>
            <span className="tabular-nums">
              {closed ? (
                <span className={compact ? '' : 'italic'}>Fermé</span>
              ) : (
                slots.map((s) => `${fmt(s.opens_at)} – ${fmt(s.closes_at)}`).join(' · ')
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const TIMEZONE = 'Africa/Algiers';

/** Retourne {dow (ISO Mon=1…Sun=7), t ("HH:MM:SS")} dans le fuseau Algérie. */
function nowInAlgeria(): { dow: number; t: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const JS_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const jsDay = JS_DAYS.indexOf(get('weekday'));
  const dow = ((jsDay + 6) % 7) + 1; // ISO Mon=1 … Sun=7
  const t = `${get('hour').padStart(2, '0')}:${get('minute').padStart(2, '0')}:${get('second').padStart(2, '0')}`;
  return { dow, t };
}

/** Calcule si on est dans les horaires maintenant (fuseau Algérie). */
export function isOpenNow(hours: OpeningHour[]): boolean {
  if (hours.length === 0) return true;
  const { dow, t } = nowInAlgeria();
  return hours.some(
    (h) =>
      h.day_of_week === dow &&
      !h.is_closed &&
      t >= h.opens_at &&
      t < h.closes_at,
  );
}
