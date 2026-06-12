'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRestaurateur } from '@/lib/auth';

const daySchema = z.object({
  day_of_week: z.number().int().min(1).max(7),
  is_closed: z.boolean(),
  opens_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closes_at: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export interface HoursResult {
  ok: boolean;
  error?: string;
}

export async function saveHoursAction(formData: FormData): Promise<HoursResult> {
  const { restaurant } = await requireRestaurateur();
  const raw = formData.get('hours');
  if (typeof raw !== 'string') return { ok: false, error: 'Requête invalide' };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Données invalides' };
  }

  const parsed = z.array(daySchema).length(7).safeParse(json);
  if (!parsed.success) return { ok: false, error: 'Données invalides' };

  // Validation logique : si pas fermé, opens_at < closes_at requis
  for (const d of parsed.data) {
    if (!d.is_closed) {
      if (!d.opens_at || !d.closes_at) {
        return { ok: false, error: 'Heures manquantes pour un jour ouvert' };
      }
      if (d.opens_at >= d.closes_at) {
        return { ok: false, error: 'L\'heure de fermeture doit être après l\'ouverture' };
      }
    }
  }

  const supabase = await createClient();

  // Remplacement atomique côté serveur (delete + insert dans une transaction).
  // On n'envoie que les jours ouverts ; les jours fermés sont simplement absents.
  const rows = parsed.data
    .filter((d) => !d.is_closed)
    .map((d) => ({
      day_of_week: d.day_of_week,
      opens_at: d.opens_at + ':00',
      closes_at: d.closes_at + ':00',
    }));

  const { error } = await supabase.rpc('save_opening_hours', {
    p_restaurant_id: restaurant.id,
    p_rows: rows,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard/horaires');
  revalidatePath('/dashboard');
  return { ok: true };
}
