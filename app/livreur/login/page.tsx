'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth-shell';
import { livreurLoginAction, type LivreurLoginState } from './actions';

const initial: LivreurLoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Connexion…' : 'Commencer ma tournée'}
    </Button>
  );
}

export default function LivreurLoginPage() {
  const [state, formAction] = useActionState(livreurLoginAction, initial);

  return (
    <AuthShell
      title="Espace livreur"
      subtitle="Utilisez l'identifiant fourni par votre restaurant."
    >
      <form action={formAction} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="username">Identifiant</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="votre identifiant"
            aria-invalid={!!state?.fieldErrors?.username}
          />
          {state?.fieldErrors?.username && (
            <p className="text-xs text-destructive">{state.fieldErrors.username}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!state?.fieldErrors?.password}
          />
          {state?.fieldErrors?.password && (
            <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
          )}
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
      </form>
    </AuthShell>
  );
}
