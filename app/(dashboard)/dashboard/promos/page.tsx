import { requireRestaurateur } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { Ticket } from 'lucide-react';
import { CreatePromoForm } from './create-form';
import { PromoRowActions } from './row-actions';
import type { PromoCode } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PromosPage() {
  const { restaurant } = await requireRestaurateur();
  const supabase = await createClient();
  const { data: promos } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .returns<PromoCode[]>();

  const total = promos?.length ?? 0;
  const active = promos?.filter((p) => p.is_active).length ?? 0;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Marketing"
        title="Codes promo"
        description={
          total > 0
            ? `${active} actif${active > 1 ? 's' : ''} sur ${total}`
            : 'Créez des codes promo pour fidéliser vos clients.'
        }
      />

      <PanelCard padded={false}>
        <PanelHeader
          title="Nouveau code"
          description="Pourcentage de réduction ou montant fixe en DA."
        />
        <div className="p-5 md:p-6">
          <CreatePromoForm />
        </div>
      </PanelCard>

      <PanelCard padded={false}>
        <PanelHeader title={`Mes codes (${total})`} />
        {total === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Ticket className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-lg font-bold">Aucun code promo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez votre premier code ci-dessus pour fidéliser vos clients.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(promos ?? []).map((p) => {
              const expired = p.expires_at && new Date(p.expires_at) < new Date();
              const exhausted = p.max_uses != null && p.used_count >= p.max_uses;
              const dead = !p.is_active || expired || exhausted;
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-muted/40 md:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-md bg-foreground px-2.5 py-1 font-mono text-sm font-bold text-background">
                        {p.code}
                      </code>
                      <span className="font-display text-base font-bold text-primary">
                        {p.discount_type === 'percent'
                          ? `-${p.discount_value}%`
                          : `-${formatPrice(p.discount_value)}`}
                      </span>
                      {p.is_active && !expired && !exhausted && (
                        <Badge variant="success">Actif</Badge>
                      )}
                      {!p.is_active && <Badge variant="secondary">Désactivé</Badge>}
                      {expired && <Badge variant="destructive">Expiré</Badge>}
                      {exhausted && <Badge variant="warning">Épuisé</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.min_order > 0 && <>Min. {formatPrice(p.min_order)} · </>}
                      {p.max_uses != null && (
                        <>
                          {p.used_count}/{p.max_uses} utilisé{p.used_count > 1 ? 's' : ''} ·{' '}
                        </>
                      )}
                      {p.max_uses == null && <>{p.used_count} utilisation(s) · </>}
                      {p.expires_at
                        ? `Expire le ${new Date(p.expires_at).toLocaleDateString('fr-FR')}`
                        : 'Sans expiration'}
                    </p>
                  </div>
                  <PromoRowActions id={p.id} isActive={p.is_active} disabled={dead && !p.is_active} />
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
