import 'server-only';
import { FROM_EMAIL, getResend } from './client';
import {
  passwordResetCodeEmail,
  subscriptionReminderEmail,
  verificationCodeEmail,
  type SubscriptionReminderData,
} from './templates';

/**
 * Toutes les fonctions sont "best-effort" : si Resend n'est pas configuré ou échoue,
 * on log mais on ne bloque pas le flux applicatif.
 *
 * Retourne `true` si l'email a bien été remis à Resend, `false` sinon — utile
 * quand l'appelant veut savoir si le code a pu partir (inscription / reset).
 */
async function send(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn('[emails] RESEND_API_KEY non configuré — email ignoré :', opts.subject);
    return false;
  }
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (error) {
    console.error('[emails] envoi échoué :', error);
    return false;
  }
  return true;
}

/** Code à 6 chiffres pour vérifier l'email à l'inscription. */
export async function sendVerificationCode(opts: { to: string; code: string }): Promise<boolean> {
  const { subject, html, text } = verificationCodeEmail({ code: opts.code });
  return send({ to: opts.to, subject, html, text });
}

/** Code à 6 chiffres pour réinitialiser le mot de passe. */
export async function sendPasswordResetCode(opts: { to: string; code: string }): Promise<boolean> {
  const { subject, html, text } = passwordResetCodeEmail({ code: opts.code });
  return send({ to: opts.to, subject, html, text });
}

/** Rappel « J-3 » de fin d'essai ou d'abonnement. */
export async function sendSubscriptionReminder(
  opts: { to: string } & SubscriptionReminderData,
): Promise<boolean> {
  const { to, ...data } = opts;
  const { subject, html, text } = subscriptionReminderEmail(data);
  return send({ to, subject, html, text });
}
