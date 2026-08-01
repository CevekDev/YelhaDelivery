'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth-shell';
import { requestAdminPasswordReset, type ResetRequestState } from './actions';

const initial: ResetRequestState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
    </Button>
  );
}

export default function AdminForgotPasswordPage() {
  const [state, formAction] = useActionState(requestAdminPasswordReset, initial);

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Réinitialisation du compte super admin."
    >
      {state?.ok ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-3 text-sm text-success">
            Si une adresse e-mail est associée à ce compte, un lien de réinitialisation vient d’être
            envoyé. Vérifiez votre boîte de réception.
          </div>
          <Link href="/admin/login" className="block text-center text-sm text-primary hover:underline">
            ← Retour à la connexion
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail du compte admin</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="vous@exemple.com"
            />
          </div>

          {state?.error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <SubmitButton />

          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            ⚠ Le compte admin par défaut utilise un identifiant (pseudo-domaine
            <code> @admin.yelha.net</code>), qui n’est pas une vraie boîte mail. Ce lien ne
            fonctionne que si une <strong>vraie adresse e-mail</strong> a été associée au compte.
            Sinon, réinitialisez le mot de passe depuis le <strong>Dashboard Supabase</strong>.
          </p>

          <Link href="/admin/login" className="block text-center text-sm text-primary hover:underline">
            ← Retour à la connexion
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
