'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendPasswordResetCode } from '@/lib/emails/send';

const schema = z.object({ email: z.string().trim().email() });

export interface ResetRequestState {
  ok?: boolean;
  error?: string;
}

/**
 * Demande de réinitialisation de mot de passe (restaurateur).
 *
 * On génère un code OTP via Supabase (`admin.generateLink` — qui NE fait PAS
 * d'envoi) puis on l'envoie nous-mêmes via Resend. Aucune config SMTP ni
 * Redirect URL n'est requise côté Supabase.
 *
 * Anti-énumération : on renvoie TOUJOURS un succès générique, que le compte
 * existe ou non.
 */
export async function requestPasswordResetAction(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Adresse email invalide.' };

  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const rl = await checkRateLimit(`reset:${ip}`);
  if (!rl.allowed) {
    return {
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.resetInSeconds / 60)} minutes.`,
    };
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email });
    const otp = data?.properties?.email_otp;
    if (!error && otp) {
      const sent = await sendPasswordResetCode({ to: email, code: otp });
      if (!sent && !process.env.RESEND_API_KEY) {
        // Dev sans clé Resend : on affiche le code dans les logs serveur.
        console.warn(`[reset] DEV — code de réinitialisation pour ${email} : ${otp}`);
      }
    }
    // Un compte inexistant fait échouer generateLink → on ignore (anti-énumération).
  } catch (e) {
    console.error('[reset] request failed', e);
  }

  return { ok: true };
}
