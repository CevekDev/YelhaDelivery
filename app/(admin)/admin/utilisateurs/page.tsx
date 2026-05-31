import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { PageHeader, PanelCard, PanelHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import { Shield, Store, Bike } from 'lucide-react';
import type { Profile } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminUtilisateursPage() {
  await requireRole('admin');
  const admin = await createAdminClient();
  const { data: users } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<Profile[]>();

  const groups = {
    admin: (users ?? []).filter((u) => u.role === 'admin'),
    restaurateur: (users ?? []).filter((u) => u.role === 'restaurateur'),
    livreur: (users ?? []).filter((u) => u.role === 'livreur'),
  };

  const ROLE_META = {
    admin: { label: 'Administrateurs', icon: Shield, color: 'text-destructive' },
    restaurateur: { label: 'Restaurateurs', icon: Store, color: 'text-primary' },
    livreur: { label: 'Livreurs', icon: Bike, color: 'text-success' },
  } as const;

  return (
    <div className="container space-y-6 py-6 md:py-8">
      <PageHeader
        eyebrow="Utilisateurs"
        title="Tous les comptes"
        description={`${users?.length ?? 0} compte${(users?.length ?? 0) > 1 ? 's' : ''} au total sur la plateforme`}
      />

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {(['admin', 'restaurateur', 'livreur'] as const).map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          return (
            <div
              key={role}
              className="rounded-2xl border border-border bg-background p-4 shadow-card"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 font-display text-2xl font-extrabold">{groups[role].length}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>
            </div>
          );
        })}
      </div>

      {(['admin', 'restaurateur', 'livreur'] as const).map((role) => {
        const meta = ROLE_META[role];
        const list = groups[role];
        return (
          <PanelCard key={role} padded={false}>
            <PanelHeader title={meta.label} description={`${list.length} compte${list.length > 1 ? 's' : ''}`} />
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun utilisateur dans cette catégorie.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40 md:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-muted ${meta.color}`}>
                        {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{u.full_name || u.username || u.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.username && `@${u.username} · `}
                          créé {formatRelativeTime(u.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={u.is_active ? 'success' : 'secondary'}>
                      {u.is_active ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        );
      })}
    </div>
  );
}
