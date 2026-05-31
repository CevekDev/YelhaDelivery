import Link from 'next/link';
import { RegisterForm } from './register-form';
import { Sparkles, ShieldCheck, Clock } from 'lucide-react';

export const metadata = {
  title: 'Créer mon compte restaurateur',
  description:
    'Inscrivez votre restaurant sur YelhaDms en 2 minutes. Gratuit. Paiement cash à la livraison.',
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-extrabold">
            Yelha<span className="text-primary">Dms</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Déjà inscrit ?{' '}
            <span className="font-semibold text-primary">Se connecter</span>
          </Link>
        </div>
      </header>

      <div className="container grid items-start gap-12 py-10 md:grid-cols-2 md:py-16 lg:gap-20">
        {/* Pitch à gauche (desktop uniquement) */}
        <aside className="hidden md:block">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" />
            Inscription gratuite
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Lancez votre restaurant en{' '}
            <span className="text-primary">2 minutes</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Créez votre compte, ajoutez vos plats, partagez le lien. Vos commandes arrivent en
            temps réel sur votre dashboard.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              'Menu en ligne illimité avec photos',
              'Commandes en temps réel + notification sonore',
              'Gestion de vos propres livreurs',
              'Paiement cash à la livraison — 0% commission',
              'Page publique personnalisée /r/votre-resto',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  ✓
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Mise en ligne immédiate
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre page publique est créée dès l&apos;inscription. Configurez votre menu, activez
              &laquo;&nbsp;Restaurant ouvert&nbsp;&raquo; et commencez à recevoir des commandes.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Aucune carte bancaire</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-success" /> Annulable à tout moment</span>
          </div>
        </aside>

        <RegisterForm />
      </div>
    </main>
  );
}
