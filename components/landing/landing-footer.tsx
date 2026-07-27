import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-[#0D0D0D] px-8 py-16 text-center text-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)]">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-primary/15 blur-[60px]" />

        <div className="relative">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Zap className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            Prêt à digitaliser
            <br />
            <span className="text-primary">votre livraison ?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-white/60">
            Créez votre compte en 2 minutes. Partagez votre lien.
            Recevez votre première commande aujourd&apos;hui.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-[0_4px_20px_rgb(255,92,26,0.35)] transition-all hover:bg-primary-dark active:scale-[0.99]"
            >
              Inscrire mon restaurant gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:contact@yelha.net"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-base font-semibold text-white/70 transition-all hover:border-white/20 hover:text-white"
            >
              Nous contacter
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter({ demoSlug }: { demoSlug: string | null }) {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
                Y
              </span>
              <span className="font-extrabold tracking-tight">
                Yelha<span className="text-primary">Delivery</span>
              </span>
            </Link>
            <p className="mt-2 max-w-xs text-xs text-gray-500">
              Plateforme de gestion de livraison pour restaurants algériens.
              Données hébergées en Europe 🇪🇺
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Accès</p>
              <Link href="/login" className="block hover:text-primary">Restaurateur</Link>
              <Link href="/livreur/login" className="block hover:text-primary">Livreur</Link>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Légal</p>
              <Link href="/cgu" className="block hover:text-primary">CGU</Link>
              <a href="mailto:contact@yelha.net" className="block hover:text-primary">Contact</a>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Démo</p>
              {demoSlug && (
                <Link href={`/r/${demoSlug}`} className="block hover:text-primary">
                  Voir un menu
                </Link>
              )}
              <Link href="/register" className="block hover:text-primary">
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-gray-100 pt-6 text-xs text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} YelhaDelivery. Tous droits réservés.</p>
          <p className="flex items-center gap-1">
            Fait avec <span className="text-primary">♥</span> pour l&apos;Algérie
          </p>
        </div>
      </div>
    </footer>
  );
}
