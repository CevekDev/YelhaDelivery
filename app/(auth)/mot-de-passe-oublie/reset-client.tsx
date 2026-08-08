'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth-shell';
import { createClient } from '@/lib/supabase/client';
import { requestPasswordResetAction, type ResetRequestState } from './actions';

const initial: ResetRequestState = {};

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Envoi…' : 'Recevoir le code'}
    </Button>
  );
}

export function ResetClient() {
  const router = useRouter();
  const [state, formAction] = useActionState(requestPasswordResetAction, initial);

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // Le succès générique de l'étape 1 déclenche le passage à l'étape 2.
  useEffect(() => {
    if (state?.ok) setStep('reset');
  }, [state?.ok]);

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setError('Entrez le code à 6 chiffres reçu par email.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    const supabase = supabaseRef.current ?? (supabaseRef.current = createClient());
    setPending(true);
    const { error: vErr } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (vErr) {
      setPending(false);
      setError('Code invalide ou expiré. Vérifiez le code ou refaites une demande.');
      return;
    }
    const { error: uErr } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (uErr) {
      setError('Impossible de mettre à jour le mot de passe. Réessayez.');
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push('/login?reset=1'), 1500);
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Réinitialisez votre mot de passe restaurateur."
    >
      {done ? (
        <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-3 text-sm text-success">
          Mot de passe mis à jour ✓ Redirection vers la connexion…
        </div>
      ) : step === 'request' ? (
        <form action={formAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse email de votre compte</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <RequestButton />

          <Link href="/login" className="block text-center text-sm text-primary hover:underline">
            ← Retour à la connexion
          </Link>
        </form>
      ) : (
        <form onSubmit={submitReset} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">
            Si un compte existe pour <strong>{email || 'cette adresse'}</strong>, un code à 6
            chiffres vient d&apos;être envoyé. Saisissez-le avec votre nouveau mot de passe.
          </p>

          <div className="space-y-2">
            <Label htmlFor="code">Code reçu par email</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="______"
              className="text-center text-2xl tracking-[0.5em]"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
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
            {pending ? 'Réinitialisation…' : 'Réinitialiser mon mot de passe'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep('request');
              setError(null);
              setCode('');
            }}
            className="block w-full text-center text-sm text-muted-foreground hover:underline"
          >
            ← Utiliser une autre adresse
          </button>
        </form>
      )}
    </AuthShell>
  );
}
