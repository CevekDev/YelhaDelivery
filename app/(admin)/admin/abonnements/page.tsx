import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { buildWhatsAppLink } from '@/lib/subscription';
import { SubscriptionRequestActions } from './request-actions';
import { ExternalLink, Inbox, MessageCircle } from 'lucide-react';
import type { SubscriptionRequest } from '@/types/database';

export const dynamic = 'force-dynamic';

type RestoLite = { name: string; slug: string; phone: string | null };
type Row = SubscriptionRequest & {
  restaurant: RestoLite | RestoLite[] | null;
};

function restoOf(r: Row): RestoLite | null {
  if (!r.restaurant) return null;
  return Array.isArray(r.restaurant) ? (r.restaurant[0] ?? null) : r.restaurant;
}

/** Numéro DZ local (0X…) → lien wa.me international (213…). */
function whatsappFromPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  const intl = digits.startsWith('0') ? `213${digits.slice(1)}` : digits;
  return buildWhatsAppLink(intl, '');
}

export default async function AdminAbonnementsPage() {
  await requireRole('admin');
  const supabase = await createClient();

  const { data } = await supabase
    .from('subscription_requests')
    .select('*, restaurant:restaurants(name, slug, phone)')
    .order('created_at', { ascending: false })
    .limit(150)
    .returns<Row[]>();

  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === 'pending');
  const history = rows.filter((r) => r.status !== 'pending');

  return (
    <div className="container max-w-5xl space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Facturation"
        title="Demandes d’abonnement"
        description="Validez ou refusez les paiements des restaurateurs. Valider active/prolonge leur accès immédiatement."
      />

      <PanelCard padded={false}>
        <PanelHeader
          title={`À valider (${pending.length})`}
          description="Vérifiez la preuve de paiement avant de valider."
        />
        {pending.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Aucune demande en attente.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((r) => {
              const resto = restoOf(r);
              return (
                <li key={r.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start md:justify-between md:px-6">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {resto ? (
                        <Link href={`/admin/restaurants/${r.restaurant_id}`} className="hover:underline">
                          {resto.name}
                        </Link>
                      ) : (
                        'Restaurant supprimé'
                      )}
                    </p>
                    <p className="mt-0.5 text-sm">
                      Offre <strong>{r.plan_name}</strong> · {r.months} mois ·{' '}
                      <span className="font-display font-bold tabular-nums">
                        {formatPrice(r.total_price)}
                      </span>
                      {r.discount_percent > 0 && (
                        <span className="ml-1 text-xs text-success">(−{r.discount_percent}%)</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatPrice(r.monthly_price)}/mois ·{' '}
                      {r.driver_limit === null
                        ? 'livreurs illimités'
                        : `${r.driver_limit} livreur${r.driver_limit > 1 ? 's' : ''}`}{' '}
                      · demandé {formatRelativeTime(r.created_at)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2.5 py-1 text-xs font-medium text-[#128C7E]">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Preuve à recevoir sur WhatsApp
                      </span>
                      {whatsappFromPhone(resto?.phone ?? null) && (
                        <a
                          href={whatsappFromPhone(resto?.phone ?? null)!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Contacter le resto <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {r.proof_url && (
                        <a
                          href={r.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Ouvrir la preuve <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <SubscriptionRequestActions id={r.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>

      <PanelCard padded={false}>
        <PanelHeader title="Historique" description="Demandes déjà traitées." />
        {history.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucun historique.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((r) => {
              const resto = restoOf(r);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 md:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {resto?.name ?? 'Restaurant supprimé'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.plan_name} · {r.months} mois · {formatPrice(r.total_price)}
                      {r.reviewed_at && <> · {formatRelativeTime(r.reviewed_at)}</>}
                      {r.status === 'rejected' && r.admin_note && (
                        <span className="text-destructive"> · {r.admin_note}</span>
                      )}
                    </p>
                  </div>
                  <Badge variant={r.status === 'approved' ? 'success' : 'destructive'}>
                    {r.status === 'approved' ? 'Validé' : 'Refusé'}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
