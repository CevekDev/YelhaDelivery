'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth-shell';
import { loginAction, type LoginState } from './actions';

const initial: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  );
}

export function LoginClient() {
  const [state, formAction] = useActionState(loginAction, initial);
  const searchParams = useSearchParams();
  const justCreated = searchParams.get('created') === '1';
  const errorParam = searchParams.get('error');

  return (
    <AuthShell
      title="Espace restaurateur"
      subtitle="Connectez-vous pour gérer votre restaurant."
      marketing={{
        eyebrow: 'Espace restaurateur',
        headline: (
          <>
            Vos commandes, <span className="text-primary">en temps réel.</span>
          </>
        ),
        bullets: [
          'Menu en ligne illimité avec photos',
          'Commandes en temps réel + notification sonore',
          'Gestion intégrée de vos livreurs',
          'Cash à la livraison — 0% commission',
        ],
      }}
      footer={
        <>
          <p className="text-muted-foreground">
            Pas encore inscrit ?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Créer mon compte
            </Link>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href="/livreur/login" className="hover:text-foreground">
              Espace livreur →
            </Link>
          </p>
        </>
      }
    >
      {justCreated && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          ✓ Votre compte a été créé. Connectez-vous pour accéder à votre dashboard.
        </div>
      )}
      {errorParam === 'compte_inactif' && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Votre compte est désactivé. Contactez le support.
        </div>
      )}
      {errorParam === 'acces_refuse' && (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          Vous n&apos;avez pas accès à cet espace.
        </div>
      )}

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
            placeholder="vous@exemple.com"
            aria-invalid={!!state?.fieldErrors?.email}
          />
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
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
