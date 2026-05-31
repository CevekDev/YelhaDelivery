import { Suspense } from 'react';
import { LoginClient } from './login-client';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
            Chargement…
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
