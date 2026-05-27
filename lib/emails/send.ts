import 'server-only';
import { APP_URL, FROM_EMAIL, getResend } from './client';
import {
  livreurCreatedEmail,
  newOrderEmail,
  welcomeRestaurateurEmail,
  type NewOrderEmailData,
} from './templates';

/**
 * Toutes les fonctions sont "best-effort" : si Resend n'est pas configuré ou échoue,
 * on log mais on ne bloque pas le flux applicatif.
 */

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[emails] RESEND_API_KEY non configuré — email ignoré :', opts.subject);
    return;
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
  }
}

export async function sendNewOrderToRestaurateur(opts: {
  to: string;
  restaurantName: string;
  order: Omit<NewOrderEmailData, 'dashboardUrl' | 'restaurantName'>;
}): Promise<void> {
  const { subject, html, text } = newOrderEmail({
    ...opts.order,
    restaurantName: opts.restaurantName,
    dashboardUrl: `${APP_URL}/dashboard/commandes`,
  });
  await send({ to: opts.to, subject, html, text });
}

export async function sendRestaurateurWelcome(opts: {
  to: string;
  fullName: string;
  restaurantName: string;
  slug: string;
}): Promise<void> {
  const { subject, html, text } = welcomeRestaurateurEmail({
    fullName: opts.fullName,
    restaurantName: opts.restaurantName,
    slug: opts.slug,
    loginUrl: `${APP_URL}/login`,
    publicUrl: `${APP_URL}/r/${opts.slug}`,
  });
  await send({ to: opts.to, subject, html, text });
}

export async function sendLivreurCreated(opts: {
  to: string;
  ownerFullName: string;
  restaurantName: string;
  livreurFullName: string;
  username: string;
}): Promise<void> {
  const { subject, html, text } = livreurCreatedEmail({
    ownerFullName: opts.ownerFullName,
    restaurantName: opts.restaurantName,
    livreurFullName: opts.livreurFullName,
    username: opts.username,
    loginUrl: `${APP_URL}/livreur/login`,
  });
  await send({ to: opts.to, subject, html, text });
}
