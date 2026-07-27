import Image from 'next/image';
import { ArrowRight, CheckCircle2, MessageSquare, Store } from 'lucide-react';
import type { ShowcaseRestaurant } from '@/lib/public-data';

export function ShowcaseSection({ restaurants }: { restaurants: ShowcaseRestaurant[] }) {
  if (restaurants.length === 0) return null;
  return (
    <section className="bg-[#FAFAFA] py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Store className="h-3.5 w-3.5" /> Déjà en ligne
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Des sites <span className="text-primary">créés avec YelhaDelivery</span>
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Chaque restaurant a sa propre page de commande. Cliquez pour en visiter.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <a
              key={r.slug}
              href={`/r/${r.slug}`}
              className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                {r.cover_url ? (
                  <Image
                    src={r.cover_url}
                    alt={r.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-bold">{r.name}</h3>
                  {r.city && <span className="shrink-0 text-xs text-gray-500">{r.city}</span>}
                </div>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{r.description}</p>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Voir le site <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

const COMPARISON = [
  { label: 'Commission', other: '15–30%', ours: '0%' },
  { label: 'Vos données clients', other: 'Partagées', ours: 'À vous' },
  { label: 'Vos livreurs', other: 'Imposés', ours: 'Les vôtres' },
  { label: 'Code promo', other: 'Non', ours: 'Oui' },
  { label: 'Paiement cash', other: 'Non', ours: 'Oui' },
  { label: 'Page sur mesure', other: 'Non', ours: 'Votre lien' },
];

export function WhyYelha() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <MessageSquare className="h-3.5 w-3.5" /> Fait pour vous
          </span>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Pensé pour les
            <br />
            <span className="text-primary">restaurants algériens</span>
          </h2>
          <p className="mt-4 text-base text-gray-500">
            Les grandes plateformes prennent entre 15% et 30% sur chaque commande.
            YelhaDelivery vous donne votre propre page de commande — sans commission,
            sans partage de vos clients.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              'Votre propre lien de commande (ex: yelha.net/r/votre-resto)',
              'Paiement en espèces — adapté au marché algérien',
              'Livreurs gérés directement par vous',
              'Avis clients rattachés à votre restaurant',
              'Code promo personnalisé pour fidéliser vos clients',
              'Suivi commande en temps réel pour vos clients',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Comparison table — responsive : padding et typo réduits sur mobile */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-1 bg-gray-50 px-3 py-3 text-[10px] font-bold uppercase leading-tight tracking-wide text-gray-500 md:px-5 md:text-xs">
            <span>Critère</span>
            <span className="text-center">Grandes plateformes</span>
            <span className="text-center text-primary">YelhaDelivery</span>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1.2fr_1fr_1fr] items-center gap-1 px-3 py-3 text-[13px] md:px-5 md:py-3.5 md:text-sm ${
                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }`}
            >
              <span className="font-medium text-gray-700">{row.label}</span>
              <span className="text-center text-gray-500">{row.other}</span>
              <span className="text-center font-bold text-primary">{row.ours}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
