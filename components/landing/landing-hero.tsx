import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Smartphone } from 'lucide-react';

export function LandingHero({ demoSlug }: { demoSlug: string | null }) {
  return (
    <section className="relative overflow-hidden bg-[#0D0D0D] text-white">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 md:px-6 md:pb-28 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Plateforme pensée pour l&apos;Algérie 🇩🇿
            </div>

            <h1 className="mt-6 text-[2.6rem] font-black leading-[1.05] tracking-tight md:text-6xl lg:text-[4rem]">
              Gérez votre
              <br />
              <span className="text-primary">livraison.</span>
              <br />
              Sans commission.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
              Menu en ligne, commandes en temps réel, livreurs intégrés — tout en un.
              Paiement cash à la livraison, 0% de commission prélevé.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-[0_4px_20px_rgb(255,92,26,0.40)] transition-all hover:bg-primary-dark active:scale-[0.99]"
              >
                Inscrire mon restaurant
                <ArrowRight className="h-4 w-4" />
              </Link>
              {demoSlug && (
                <Link
                  href={`/r/${demoSlug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white/80 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/10"
                >
                  Voir un menu démo
                </Link>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Inscription gratuite
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                2 min pour démarrer
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Sans engagement
              </span>
            </div>
          </div>

          {/* Right — Dashboard mock (illustration décorative) */}
          <div className="relative hidden lg:block" aria-hidden>
            <div className="relative mx-auto w-full max-w-sm">
              {/* Phone frame */}
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#1A1A1A] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)]">
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 py-3">
                  <span className="text-[11px] font-semibold text-white/60">9:41</span>
                  <div className="h-3 w-20 rounded-full bg-black" />
                  <div className="flex items-center gap-1">
                    <span className="block h-2.5 w-1 rounded-sm bg-white/40" />
                    <span className="block h-2.5 w-1 rounded-sm bg-white/40" />
                    <span className="block h-2.5 w-1 rounded-sm bg-white/60" />
                    <span className="block h-2.5 w-1 rounded-sm bg-white/80" />
                  </div>
                </div>

                {/* App content */}
                <div className="px-4 pb-6">
                  {/* New order alert */}
                  <div className="mb-3 flex items-center gap-3 rounded-2xl bg-primary p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Smartphone className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Nouvelle commande !</p>
                      <p className="text-[10px] text-white/70">Karim B. · 1 850 DA</p>
                    </div>
                    <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-black text-primary">
                      1
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Commandes', val: '14', icon: '🛍️' },
                      { label: 'CA du jour', val: '24 500 DA', icon: '💰' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-white/5 bg-white/5 p-3">
                        <p className="text-base">{s.icon}</p>
                        <p className="mt-1 font-black text-white">{s.val}</p>
                        <p className="text-[10px] text-white/60">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Order list */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Dernières commandes
                    </p>
                    {[
                      { name: 'Karim B.', status: 'En préparation', amount: '1 850', color: 'bg-amber-500' },
                      { name: 'Amira K.', status: 'En livraison', amount: '2 300', color: 'bg-blue-500' },
                      { name: 'Yacine M.', status: 'Livré', amount: '950', color: 'bg-green-500' },
                    ].map((o) => (
                      <div
                        key={o.name}
                        className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/5 p-2.5"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-black text-white">
                          {o.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-white">{o.name}</p>
                          <div className="flex items-center gap-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${o.color}`} />
                            <p className="text-[10px] text-white/60">{o.status}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-white">{o.amount} DA</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -right-8 top-16 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 shadow-xl backdrop-blur-md">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-white">0% commission</span>
              </div>
              <div className="absolute -left-10 bottom-24 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 shadow-xl backdrop-blur-md">
                <span className="text-lg">🚀</span>
                <div>
                  <p className="text-[10px] font-bold text-white">Actif en 5 min</p>
                  <p className="text-[9px] text-white/60">Inscription gratuite</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StatsBand() {
  return (
    <section className="border-y border-gray-100 bg-[#FAFAFA]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { val: '0%', label: 'Commission prélevée', icon: '💸' },
            { val: 'Cash', label: 'Paiement à la livraison', icon: '💵' },
            { val: '5 min', label: 'Pour lancer votre menu', icon: '⚡' },
            { val: '24/7', label: 'Plateforme disponible', icon: '🛡️' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl" aria-hidden>
                {s.icon}
              </p>
              <p className="mt-1 font-black text-[1.6rem] leading-none text-[#1A1A1A] md:text-3xl">
                {s.val}
              </p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
