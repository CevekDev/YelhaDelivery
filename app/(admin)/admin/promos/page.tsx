import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { Ticket } from 'lucide-react';
import type { PromoCode, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminPromosPage() {
  await requireRole('admin');
  const admin = await createClient();

  const [{ data: promos }, { data: restaurants }] = await Promise.all([
    admin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<PromoCode[]>(),
    admin
      .from('restaurants')
      .select('id, name, slug')
      .returns<Pick<Restaurant, 'id' | 'name' | 'slug'>[]>(),
  ]);
  const restoById = new Map((restaurants ?? []).map((r) => [r.id, r]));

  const now = new Date();
  const isExpired = (p: PromoCode) => p.expires_at != null && new Date(p.expires_at) < now;
  const isExhausted = (p: PromoCode) => p.max_uses != null && p.used_count >= p.max_uses;

  const active = (promos ?? []).filter((p) => p.is_active && !isExpired(p) && !isExhausted(p));
  const inactive = (promos ?? []).filter((p) => !p.is_active || isExpired(p) || isExhausted(p));
  const totalUses = (promos ?? []).reduce((s, p) => s + p.used_count, 0);

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Marketing"
        title="Codes promo"
        description={`${active.length} actif${active.length > 1 ? 's' : ''} · ${totalUses} utilisation${totalUses > 1 ? 's' : ''} au total`}
      />

      <PanelCard padded={false}>
        <PanelHeader
          title={`Codes actifs (${active.length})`}
          description="Codes utilisables actuellement par les clients"
        />
        <PromoList list={active} restoById={restoById} />
      </PanelCard>

      <PanelCard padded={false}>
        <PanelHeader
          title={`Inactifs / expirés / épuisés (${inactive.length})`}
          description="Historique"
        />
        <PromoList list={inactive} restoById={restoById} muted />
      </PanelCard>
    </div>
  );
}

function PromoList({
  list,
  restoById,
  muted,
}: {
  list: PromoCode[];
  restoById: Map<string, Pick<Restaurant, 'id' | 'name' | 'slug'>>;
  muted?: boolean;
}) {
  const now = new Date();
  if (list.length === 0) {
    return (
      <div className="py-10 text-center">
        <Ticket className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Aucun code dans cette catégorie.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {list.map((p) => {
        const resto = restoById.get(p.restaurant_id);
        const expired = p.expires_at != null && new Date(p.expires_at) < now;
        const exhausted = p.max_uses != null && p.used_count >= p.max_uses;
        const label =
          p.discount_type === 'percent'
            ? `${p.discount_value}%`
            : formatPrice(p.discount_value);
        return (
          <li
            key={p.id}
            className={
              'flex items-center gap-3 px-5 py-3 md:px-6 ' + (muted ? 'opacity-70' : '')
            }
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Ticket className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-sm font-bold">{p.code}</code>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  −{label}
                </span>
                {!p.is_active && <Badge variant="secondary">Désactivé</Badge>}
                {expired && <Badge variant="warning">Expiré</Badge>}
                {exhausted && <Badge variant="destructive">Épuisé</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                {resto ? (
                  <Link
                    href={`/admin/restaurants/${resto.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {resto.name}
                  </Link>
                ) : (
                  '—'
                )}{' '}
                · min. {formatPrice(p.min_order)}
                {p.expires_at && ` · expire ${formatRelativeTime(p.expires_at)}`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground">Utilisations</p>
              <p className="font-display text-sm font-bold tabular-nums">
                {p.used_count}
                {p.max_uses != null ? (
                  <span className="text-muted-foreground"> / {p.max_uses}</span>
                ) : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
