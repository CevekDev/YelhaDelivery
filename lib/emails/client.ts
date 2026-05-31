import 'server-only';
import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null; // emails désactivés en dev
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'Yelha Delivery <noreply@delivery.yelha.net>';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://delivery.yelha.net';
