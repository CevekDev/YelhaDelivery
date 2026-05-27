import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
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

  return (
    <div className="container space-y-6 py-6">
      <h1 className="font-display text-2xl font-bold">Utilisateurs ({users?.length ?? 0})</h1>

      {(['admin', 'restaurateur', 'livreur'] as const).map((role) => (
        <Card key={role}>
          <CardHeader>
            <CardTitle>
              {role === 'admin' ? 'Administrateurs' : role === 'restaurateur' ? 'Restaurateurs' : 'Livreurs'}{' '}
              ({groups[role].length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups[role].length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Aucun utilisateur.</p>
            ) : (
              <ul className="divide-y divide-border">
                {groups[role].map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.full_name || u.username || u.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.username && `@${u.username} · `}
                        créé {formatRelativeTime(u.created_at)}
                      </p>
                    </div>
                    <Badge variant={u.is_active ? 'success' : 'secondary'}>
                      {u.is_active ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
