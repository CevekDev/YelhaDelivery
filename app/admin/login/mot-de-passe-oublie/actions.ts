'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/seo';

const schema = z.object({ email: z.string().trim().email() });

export interface ResetRequestState {
  ok?: boolean;
  error?: string;
}

/**
 * Envoie un e-mail de réinitialisation de mot de passe (Supabase Auth).
 *
 * ⚠ Limitation : le compte admin est identifié par pseudo-domaine
 * (<identifiant>@admin.yelha.net), qui n'est PAS une vraie boîte mail. Ce flux
 * ne fonctionne donc que si l'admin a associé une VRAIE adresse e-mail à son
 * compte (via le Dashboard Supabase → Authentication → Users). Sinon, la
 * réinitialisation se fait directement depuis le Dashboard Supabase.
 *
 * Anti-énumération : on renvoie toujours un succès générique, que le compte
 * existe ou non.
 */
export async function requestAdminPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Adresse e-mail invalide.' };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/admin/login/nouveau-mot-de-passe`,
  });

  return { ok: true };
}
