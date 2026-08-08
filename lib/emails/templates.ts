import 'server-only';

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f5f5f4; margin: 0; padding: 0; color: #1a1916; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .brand { font-weight: 800; font-size: 22px; color: #1a1916; letter-spacing: -0.3px; }
  .brand .accent { color: #FF5C1A; }
  .h1 { font-size: 22px; font-weight: 700; margin: 18px 0 8px; }
  .muted { color: #777; font-size: 14px; }
  .btn { display: inline-block; background: #FF5C1A; color: #fff !important; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; }
  .code { display: inline-block; font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #1a1916; background: #f5f5f4; border: 1px solid #eee; border-radius: 10px; padding: 16px 24px; margin: 8px 0; }
  .footer { color: #999; font-size: 12px; text-align: center; margin-top: 24px; }
`;

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${baseStyles}</style></head>
<body><div class="container"><div class="card">
  <div class="brand">Yelha<span class="accent">Delivery</span></div>
  ${body}
</div><p class="footer">YelhaDelivery · delivery.yelha.net</p></div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────
// 1) Code de vérification à l'inscription
// ─────────────────────────────────────────────────────────────────
export function verificationCodeEmail(data: { code: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Votre code de vérification : ${data.code}`;
  const html = shell(
    'Code de vérification',
    `
    <h1 class="h1">Confirmez votre adresse email</h1>
    <p class="muted">Saisissez ce code pour finaliser la création de votre compte restaurateur :</p>
    <div style="text-align:center;margin:20px 0"><span class="code">${escapeHtml(data.code)}</span></div>
    <p class="muted">Ce code expire dans <strong>15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `,
  );
  const text = `Votre code de vérification YelhaDelivery : ${data.code}\nIl expire dans 15 minutes.`;
  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────
// 2) Code de réinitialisation du mot de passe
// ─────────────────────────────────────────────────────────────────
export function passwordResetCodeEmail(data: { code: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Réinitialisation du mot de passe : ${data.code}`;
  const html = shell(
    'Réinitialisation du mot de passe',
    `
    <h1 class="h1">Réinitialiser votre mot de passe</h1>
    <p class="muted">Utilisez ce code pour choisir un nouveau mot de passe :</p>
    <div style="text-align:center;margin:20px 0"><span class="code">${escapeHtml(data.code)}</span></div>
    <p class="muted">Ce code expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé de réinitialisation, ignorez cet email — votre mot de passe reste inchangé.</p>
    `,
  );
  const text = `Code de réinitialisation YelhaDelivery : ${data.code}\nIl expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`;
  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────
// 3) Rappel : abonnement / essai qui se termine dans 3 jours
// ─────────────────────────────────────────────────────────────────
export interface SubscriptionReminderData {
  restaurantName: string;
  isTrial: boolean;
  daysLeft: number;
  /** Date de fin lisible (ex. « 11 août 2026 »). */
  endDate: string;
  dashboardUrl: string;
}

export function subscriptionReminderEmail(data: SubscriptionReminderData): {
  subject: string;
  html: string;
  text: string;
} {
  const what = data.isTrial ? 'Votre essai gratuit' : 'Votre abonnement';
  const dayWord = data.daysLeft > 1 ? `${data.daysLeft} jours` : `${data.daysLeft} jour`;
  const subject = `${what} se termine dans ${dayWord} — ${data.restaurantName}`;
  const intro = data.isTrial
    ? `Votre essai gratuit pour <strong>${escapeHtml(data.restaurantName)}</strong> se termine le <strong>${escapeHtml(data.endDate)}</strong>. Pour continuer à recevoir des commandes sans interruption, choisissez une offre dès maintenant.`
    : `L'abonnement de <strong>${escapeHtml(data.restaurantName)}</strong> arrive à échéance le <strong>${escapeHtml(data.endDate)}</strong>. Renouvelez pour éviter la suspension de votre accès.`;
  const html = shell(
    'Rappel d’abonnement',
    `
    <h1 class="h1">${data.isTrial ? 'Votre essai se termine bientôt' : 'Pensez à renouveler'}</h1>
    <p>${intro}</p>
    <p class="muted">Sans renouvellement, votre tableau de bord sera verrouillé à l'échéance (votre site public reste en ligne).</p>
    <p style="margin-top: 22px;"><a class="btn" href="${escapeHtml(data.dashboardUrl)}">Gérer mon abonnement</a></p>
    `,
  );
  const text =
    `${what} pour ${data.restaurantName} se termine dans ${dayWord} (le ${data.endDate}).\n` +
    `Renouvelez ici : ${data.dashboardUrl}`;
  return { subject, html, text };
}
