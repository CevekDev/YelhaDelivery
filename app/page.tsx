import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bike, Clock, Smartphone, Store } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold text-foreground">
            Yelha<span className="text-primary">Dms</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Inscrire mon restaurant</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-block rounded-full bg-card px-4 py-1.5 text-sm text-primary-light">
            Plateforme conçue pour les restaurants algériens
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-balance md:text-6xl">
            Vos commandes de livraison.{' '}
            <span className="text-primary">En temps réel.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            YelhaDms centralise votre menu en ligne, vos commandes clients et vos livreurs.
            Paiement cash à la livraison, configuration en 10 minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Inscrire mon restaurant <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/r/el-bahia-alger">Voir un menu démo</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Gratuit. Sans engagement. Configuration en 2 minutes.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/30 py-20">
        <div className="container grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Store,
              title: 'Menu en ligne illimité',
              desc: 'Plats, photos, catégories, prix en DZD. Modifications instantanées.',
            },
            {
              icon: Smartphone,
              title: 'Commandes en temps réel',
              desc: 'Notification sonore à chaque nouvelle commande. Dashboard mobile-first.',
            },
            {
              icon: Bike,
              title: 'Vos livreurs intégrés',
              desc: 'Créez les comptes de vos livreurs. Ils voient leurs tournées en direct.',
            },
            {
              icon: Clock,
              title: 'Cash à la livraison',
              desc: 'Aucune intégration paiement. Vos livreurs encaissent à la porte.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="border-t border-border py-20">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Prêt à digitaliser votre livraison ?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Créez votre compte en 2 minutes. Aucune carte bancaire demandée.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Créer mon compte gratuit <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="mailto:contact@yelha.net">Nous contacter</a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} YelhaDms. Tous droits réservés.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Restaurateur
            </Link>
            <Link href="/livreur/login" className="hover:text-foreground">
              Livreur
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
