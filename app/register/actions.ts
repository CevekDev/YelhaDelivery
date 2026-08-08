'use server';

import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import {
  restaurateurRegisterSchema,
  type RestaurateurRegisterInput,
} from '@/lib/validators/register';
import { checkSignupRateLimit } from '@/lib/rate-limit';
import { sendVerificationCode } from '@/lib/emails/send';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export interface RegisterState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
  /** Étape courante du tunnel d'inscription. */
  step?: 'form' | 'verify';
  /** Message d'information (ex. « code renvoyé »). */
  notice?: string;
}

type RegisterInput = RestaurateurRegisterInput;

/** Hash du code, salé par l'email (jamais de code en clair en base). */
function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex');
}

/** Code numérique à 6 chiffres, cryptographiquement aléatoire. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Comparaison à temps constant de deux hash hexadécimaux. */
function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Inscription restaurateur en 2 étapes :
 *   1. Formulaire → envoi d'un code de vérification par email (aucun compte créé).
 *   2. Saisie du code → création réelle du compte + connexion automatique.
 *
 * Une seule action branchée sur le contenu du formulaire :
 *   • bouton « edit »   → revient à l'étape formulaire ;
 *   • bouton « resend » → renvoie un nouveau code ;
 *   • champ « code » rempli → étape de vérification ;
 *   • sinon → étape d'envoi du code.
 */
export async function registerRestaurateurAction(
  _prev: RegisterState | undefined,
  formData: FormData,
): Promise<RegisterState> {
  if (formData.get('edit') === '1') return { step: 'form' };

  const resend = formData.get('resend') === '1';
  const code = String(formData.get('code') ?? '').trim();
  const isVerifyStep = !resend && code.length > 0;

  const parsed = restaurateurRegisterSchema.safeParse({
    restaurant_name: formData.get('restaurant_name'),
    slug: formData.get('slug'),
    owner_full_name: formData.get('owner_full_name'),
    owner_email: formData.get('owner_email'),
    owner_phone: formData.get('owner_phone') ?? '',
    password: formData.get('password'),
    password_confirm: formData.get('password_confirm'),
    accept_terms: formData.get('accept_terms'),
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      step: isVerifyStep ? 'verify' : 'form',
      fieldErrors: Object.fromEntries(
        Object.entries(fe).map(([k, v]) => [k, Array.isArray(v) ? v[0] : undefined]),
      ),
    };
  }

  if (isVerifyStep) return verifyAndCreate(parsed.data, code);
  return startRegistration(parsed.data, resend);
}

/** Étape 1 : valide, génère et envoie le code, met en attente dans pending_signups. */
async function startRegistration(data: RegisterInput, isResend: boolean): Promise<RegisterState> {
  // Rate limit anti-spam par IP : 3 inscriptions / heure.
  const hdrs = await headers();
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';
  const rl = await checkSignupRateLimit(`signup:${ip}`);
  if (!rl.allowed) {
    return {
      step: 'form',
      error: `Trop de tentatives depuis cette adresse. Réessayez dans ${Math.ceil(
        rl.resetInSeconds / 60,
      )} minutes.`,
    };
  }

  const admin = await createAdminClient();

  // Unicité du slug avant d'envoyer un code inutile.
  const { data: slugTaken } = await admin
    .from('restaurants')
    .select('id')
    .eq('slug', data.slug)
    .maybeSingle();
  if (slugTaken) {
    return { step: 'form', fieldErrors: { slug: 'Cette URL est déjà utilisée. Choisissez-en une autre.' } };
  }

  // Purge opportuniste des codes expirés (garde la table légère).
  await admin.from('pending_signups').delete().lt('expires_at', new Date().toISOString());

  const email = data.owner_email.toLowerCase();
  const code = generateCode();
  const { error: upsertErr } = await admin.from('pending_signups').upsert(
    {
      email,
      code_hash: hashCode(email, code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      attempts: 0,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'email' },
  );
  if (upsertErr) {
    return { step: 'form', error: "Impossible d'initialiser la vérification. Réessayez." };
  }

  const sent = await sendVerificationCode({ to: data.owner_email, code });
  if (!sent) {
    if (process.env.RESEND_API_KEY) {
      // Prod : l'envoi a réellement échoué.
      return {
        step: 'form',
        error: "L'envoi du code a échoué. Vérifiez votre adresse email puis réessayez.",
      };
    }
    // Dev sans clé Resend : on affiche le code dans les logs serveur pour tester.
    console.warn(`[register] DEV — code de vérification pour ${email} : ${code}`);
  }

  return {
    step: 'verify',
    ok: true,
    notice: isResend ? 'Un nouveau code vient de vous être envoyé.' : undefined,
  };
}

/** Étape 2 : vérifie le code puis crée le compte (flux atomique + auto-login). */
async function verifyAndCreate(data: RegisterInput, code: string): Promise<RegisterState> {
  const admin = await createAdminClient();
  const email = data.owner_email.toLowerCase();

  const { data: pending } = await admin
    .from('pending_signups')
    .select('code_hash, expires_at, attempts')
    .eq('email', email)
    .maybeSingle<{ code_hash: string; expires_at: string; attempts: number }>();

  if (!pending) {
    return { step: 'form', error: "Session de vérification introuvable. Recommencez l'inscription." };
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await admin.from('pending_signups').delete().eq('email', email);
    return { step: 'form', error: "Le code a expiré. Recommencez l'inscription." };
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    await admin.from('pending_signups').delete().eq('email', email);
    return { step: 'form', error: "Trop de tentatives. Recommencez l'inscription." };
  }

  if (!safeEqualHex(pending.code_hash, hashCode(email, code))) {
    await admin.from('pending_signups').update({ attempts: pending.attempts + 1 }).eq('email', email);
    const left = MAX_ATTEMPTS - (pending.attempts + 1);
    return {
      step: 'verify',
      fieldErrors: {
        code: left > 0 ? `Code incorrect. ${left} essai(s) restant(s).` : 'Code incorrect.',
      },
    };
  }

  // ── Code correct → création réelle (avec rollback complet en cas d'échec) ──
  // Re-contrôle du slug (course possible depuis l'étape 1).
  const { data: slugTaken } = await admin
    .from('restaurants')
    .select('id')
    .eq('slug', data.slug)
    .maybeSingle();
  if (slugTaken) {
    return { step: 'form', fieldErrors: { slug: 'Cette URL est déjà utilisée. Choisissez-en une autre.' } };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: data.owner_email,
    password: data.password,
    email_confirm: true,
    user_metadata: { role: 'restaurateur' },
  });
  if (createErr || !created.user) {
    if (
      createErr?.message?.toLowerCase().includes('already') ||
      createErr?.message?.toLowerCase().includes('exists') ||
      createErr?.message?.toLowerCase().includes('duplicate')
    ) {
      return {
        step: 'form',
        fieldErrors: { owner_email: 'Un compte existe déjà avec cet email. Connectez-vous à la place.' },
      };
    }
    return { step: 'form', error: createErr?.message ?? 'Création du compte échouée.' };
  }

  const { error: profileErr } = await admin.from('profiles').upsert(
    {
      id: created.user.id,
      role: 'restaurateur',
      full_name: data.owner_full_name,
      phone: data.owner_phone || null,
      is_active: true,
    },
    { onConflict: 'id' },
  );
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { step: 'form', error: profileErr.message };
  }

  const { error: restErr } = await admin.from('restaurants').insert({
    owner_id: created.user.id,
    name: data.restaurant_name,
    slug: data.slug,
    phone: data.owner_phone || null,
    status: 'active',
    is_open: false,
    accept_orders: true,
  });
  if (restErr) {
    await admin.from('profiles').delete().eq('id', created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return { step: 'form', error: restErr.message };
  }

  // Consomme le code une bonne fois.
  await admin.from('pending_signups').delete().eq('email', email);

  // Le resto est actif immédiatement → rafraîchir la vitrine de la landing.
  revalidateTag('demo-restaurant');

  // Auto-login : pose les cookies de session via le client SSR (anon).
  const supabase = await createClient();
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: data.owner_email,
    password: data.password,
  });
  if (loginErr) redirect('/login?created=1');
  redirect('/dashboard?welcome=1');
}
