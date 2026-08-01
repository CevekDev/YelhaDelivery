'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth-shell';
import { createClient } from '@/lib/supabase/client';

export default function AdminNewPasswordPage() {
  const router = useRouter();
  // Le client Supabase (navigateur) n'est instancié que côté client (dans
  // l'effet ci-dessous), jamais au rendu SSR/prerender (qui n'a pas les clés).
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // Le client Supabase établit automatiquement une session de « recovery » à
  // partir du lien reçu par e-mail. On attend qu'elle soit disponible.
  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady('ok');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) setReady('ok');
    });
    const t = setTimeout(() => {
      if (active) setReady((s) => (s === 'checking' ? 'invalid' : s));
    }, 4000);
    return () => {
      active = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    const supabase = supabaseRef.current;
    if (!supabase) return;
    setPending(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (err) {
      setError('Impossible de réinitialiser le mot de passe. Le lien a peut-être expiré.');
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push('/admin/login'), 1500);
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe admin.">
      {done ? (
        <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-3 text-sm text-success">
          Mot de passe mis à jour ✓ Redirection vers la connexion…
        </div>
      ) : ready === 'invalid' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
            Lien invalide ou expiré. Refaites une demande de réinitialisation.
          </div>
          <Link
            href="/admin/login/mot-de-passe-oublie"
            className="block text-center text-sm text-primary hover:underline"
          >
            ← Nouvelle demande
          </Link>
        </div>
      ) : ready === 'checking' ? (
        <p className="text-sm text-muted-foreground">Vérification du lien…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? 'Mise à jour…' : 'Définir le mot de passe'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
