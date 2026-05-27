'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction, type LoginState } from './actions';

const initial: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 animate-fade-in">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-display text-2xl font-bold">
            Yelha<span className="text-primary">Dms</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Espace restaurateur</h1>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour gérer votre restaurant.
          </p>
        </div>

        <form action={formAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              aria-invalid={!!state?.fieldErrors?.email}
              aria-describedby={state?.fieldErrors?.email ? 'email-error' : undefined}
            />
            {state?.fieldErrors?.email && (
              <p id="email-error" className="text-xs text-destructive">
                {state.fieldErrors.email}
              </p>
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
              aria-describedby={state?.fieldErrors?.password ? 'password-error' : undefined}
            />
            {state?.fieldErrors?.password && (
              <p id="password-error" className="text-xs text-destructive">
                {state.fieldErrors.password}
              </p>
            )}
          </div>

          {state?.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>

        <div className="space-y-2 text-center text-xs text-muted-foreground">
          <p>
            <Link href="/livreur/login" className="hover:text-foreground">
              Vous êtes livreur ?
            </Link>
          </p>
          <p>
            <Link href="/" className="hover:text-foreground">
              ← Retour à l’accueil
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
