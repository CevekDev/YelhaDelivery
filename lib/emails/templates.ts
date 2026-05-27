import 'server-only';

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f5f5f4; margin: 0; padding: 0; color: #1a1916; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 20px; }
  .card { background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .brand { font-weight: 800; font-size: 22px; color: #1a1916; letter-spacing: -0.3px; }
  .brand .accent { color: #FF6B2B; }
  .h1 { font-size: 22px; font-weight: 700; margin: 18px 0 8px; }
  .muted { color: #777; font-size: 14px; }
  .btn { display: inline-block; background: #FF6B2B; color: #fff !important; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  th:last-child, td:last-child { text-align: right; }
  .footer { color: #999; font-size: 12px; text-align: center; margin-top: 24px; }
`;

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${baseStyles}</style></head>
<body><div class="container"><div class="card">
  <div class="brand">Yelha<span class="accent">Dms</span></div>
  ${body}
</div><p class="footer">YelhaDms · delivery.yelha.net</p></div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const formatDZD = (n: number) =>
  new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 0,
  }).format(n);

export interface NewOrderEmailData {
  orderNumber: string;
  restaurantName: string;
  dashboardUrl: string;
  customer: { name: string; phone: string; address: string };
  items: { item_name: string; quantity: number; subtotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string | null;
}

export function newOrderEmail(data: NewOrderEmailData): { subject: string; html: string; text: string } {
  const rows = data.items
    .map(
      (i) =>
        `<tr><td>${i.quantity} × ${escapeHtml(i.item_name)}</td><td>${formatDZD(i.subtotal)}</td></tr>`,
    )
    .join('');
  const subject = `Nouvelle commande ${data.orderNumber} — ${data.restaurantName}`;
  const html = shell(
    subject,
    `
    <h1 class="h1">Nouvelle commande reçue</h1>
    <p class="muted">Commande <strong>${escapeHtml(data.orderNumber)}</strong></p>
    <table>
      <tr><td><strong>Client</strong></td><td>${escapeHtml(data.customer.name)}</td></tr>
      <tr><td><strong>Téléphone</strong></td><td><a href="tel:${escapeHtml(data.customer.phone)}">${escapeHtml(data.customer.phone)}</a></td></tr>
      <tr><td><strong>Adresse</strong></td><td>${escapeHtml(data.customer.address)}</td></tr>
    </table>
    <table>
      <thead><tr><th>Article</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="row"><span class="muted">Sous-total</span><span>${formatDZD(data.subtotal)}</span></div>
    <div class="row"><span class="muted">Livraison</span><span>${formatDZD(data.deliveryFee)}</span></div>
    <div class="row" style="font-weight: 700; font-size: 18px;"><span>Total</span><span>${formatDZD(data.total)}</span></div>
    ${data.notes ? `<p class="muted" style="margin-top:14px"><em>« ${escapeHtml(data.notes)} »</em></p>` : ''}
    <p style="margin-top: 22px;"><a class="btn" href="${escapeHtml(data.dashboardUrl)}">Voir dans le dashboard</a></p>
    <p class="muted">💵 Paiement cash à la livraison.</p>
    `,
  );
  const text =
    `Nouvelle commande ${data.orderNumber}\n` +
    `Client : ${data.customer.name} · ${data.customer.phone}\n` +
    `Adresse : ${data.customer.address}\n` +
    data.items.map((i) => `- ${i.quantity}× ${i.item_name} = ${formatDZD(i.subtotal)}`).join('\n') +
    `\nTotal : ${formatDZD(data.total)}\n${data.dashboardUrl}`;
  return { subject, html, text };
}

export interface WelcomeEmailData {
  fullName: string;
  restaurantName: string;
  slug: string;
  loginUrl: string;
  publicUrl: string;
}

export function welcomeRestaurateurEmail(data: WelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Bienvenue sur YelhaDms, ${data.restaurantName}`;
  const html = shell(
    subject,
    `
    <h1 class="h1">Bienvenue ${escapeHtml(data.fullName)} !</h1>
    <p>Votre compte restaurateur pour <strong>${escapeHtml(data.restaurantName)}</strong> est prêt.</p>
    <p>Prochaines étapes :</p>
    <ol>
      <li>Connectez-vous à votre dashboard</li>
      <li>Complétez les informations (adresse, horaires, frais de livraison)</li>
      <li>Créez votre menu</li>
      <li>Ajoutez vos livreurs</li>
      <li>Activez « Restaurant ouvert » pour commencer à recevoir des commandes</li>
    </ol>
    <p style="margin-top: 22px;"><a class="btn" href="${escapeHtml(data.loginUrl)}">Se connecter</a></p>
    <p class="muted">Votre page publique : <a href="${escapeHtml(data.publicUrl)}">${escapeHtml(data.publicUrl)}</a></p>
    `,
  );
  const text =
    `Bienvenue ${data.fullName} !\nVotre compte ${data.restaurantName} est prêt.\nConnexion : ${data.loginUrl}\nPage publique : ${data.publicUrl}`;
  return { subject, html, text };
}

export interface LivreurCredsEmailData {
  ownerFullName: string;
  restaurantName: string;
  livreurFullName: string;
  username: string;
  loginUrl: string;
}

export function livreurCreatedEmail(data: LivreurCredsEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Livreur créé : ${data.livreurFullName}`;
  const html = shell(
    subject,
    `
    <h1 class="h1">Livreur créé</h1>
    <p>${escapeHtml(data.ownerFullName)}, vous avez créé un compte livreur pour <strong>${escapeHtml(data.restaurantName)}</strong>.</p>
    <table>
      <tr><td><strong>Nom</strong></td><td>${escapeHtml(data.livreurFullName)}</td></tr>
      <tr><td><strong>Identifiant</strong></td><td><code>${escapeHtml(data.username)}</code></td></tr>
    </table>
    <p class="muted">Le mot de passe ne figure pas dans cet email pour des raisons de sécurité. Communiquez-le directement au livreur via un canal sécurisé.</p>
    <p style="margin-top: 22px;"><a class="btn" href="${escapeHtml(data.loginUrl)}">Page de connexion livreur</a></p>
    `,
  );
  const text = `Livreur ${data.livreurFullName} créé (identifiant : ${data.username}). Connexion : ${data.loginUrl}`;
  return { subject, html, text };
}
