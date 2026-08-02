import Link from 'next/link';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { MenuItem, Restaurant } from '@/types/database';
import type { Template } from '@/lib/templates';

export interface HomeViewProps {
  template: Template;
  restaurant: Restaurant;
  slug: string;
  featured: MenuItem[];
  avgRating: number | null;
  reviewCount: number;
  estimatedDeliveryTime: number;
}

export interface Highlight {
  title: string;
  text: string;
}

export const DEFAULT_HIGHLIGHTS: Highlight[] = [
  { title: 'Livraison rapide', text: 'Vos plats préparés et livrés chauds, en un temps record.' },
  { title: 'Paiement à la livraison', text: 'Payez en espèces à réception. Simple et sans risque.' },
  { title: 'Fraîcheur garantie', text: 'Des produits sélectionnés et cuisinés à la commande.' },
];

export function PrimaryCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-7 py-3.5 text-base font-bold text-[color:var(--site-accent-fg)] transition-transform hover:scale-105"
    >
      <ShoppingBag className="h-5 w-5" />
      {label}
    </Link>
  );
}

/**
 * Placeholder élégant quand aucune photo n'est disponible — dégradé dérivé de
 * la palette du template + icône couverts. Évite les blocs de couleur « vides »
 * et donne un rendu intentionnel aux restaurants qui n'ont pas encore d'images.
 */
export function MediaPlaceholder({ hero = false }: { hero?: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${
        hero
          ? 'from-[var(--site-accent)]/25 via-[var(--site-accent)]/10 to-transparent'
          : 'from-[var(--site-accent)]/12 via-[var(--site-surface)] to-[var(--site-accent)]/5'
      }`}
    >
      <UtensilsCrossed
        className={`text-[color:var(--site-accent)] ${hero ? 'h-16 w-16 opacity-40' : 'h-9 w-9 opacity-30'}`}
        aria-hidden
      />
    </div>
  );
}
