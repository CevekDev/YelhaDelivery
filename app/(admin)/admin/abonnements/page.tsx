import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { SubscriptionRequestActions } from './request-actions';
import { ExternalLink, Inbox } from 'lucide-react';
import type { SubscriptionRequest } from '@/types/database';

export const dynamic = 'force-dynamic';

type Row = SubscriptionRequest & {
  restaurant: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function restoOf(r: Row): { name: string; slug: string } | null {
  if (!r.restaurant) return null;
  return Array.isArray(r.restaurant) ? (r.restaurant[0] ?? null) : r.restaurant;
}

export default async function AdminAbonnementsPage() {
  await requireRole('admin');
  const supabase = await createClient();

  const { data } = await supabase
    .from('subscription_requests')
    .select('*, restaurant:restaurants(name, slug)')
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
                  <div className="flex min-w-0 gap-4">
                    {r.proof_url ? (
                      <a
                        href={r.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.proof_url}
                          alt="Preuve de paiement"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </a>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                        aucune preuve
                      </div>
                    )}
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
                      {r.proof_url && (
                        <a
                          href={r.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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
