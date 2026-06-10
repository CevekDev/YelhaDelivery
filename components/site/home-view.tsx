import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, ShoppingBag, Sparkles, Star, Truck } from 'lucide-react';
import type { MenuItem, Restaurant } from '@/types/database';
import type { Template } from '@/lib/templates';
import { formatPrice } from '@/lib/utils';

interface HomeViewProps {
  template: Template;
  restaurant: Restaurant;
  slug: string;
  featured: MenuItem[];
  avgRating: number | null;
  reviewCount: number;
  estimatedDeliveryTime: number;
}

const DEFAULT_HIGHLIGHTS = [
  { title: 'Livraison rapide', text: 'Vos plats préparés et livrés chauds, en un temps record.' },
  { title: 'Paiement à la livraison', text: 'Payez en espèces à réception. Simple et sans risque.' },
  { title: 'Fraîcheur garantie', text: 'Des produits sélectionnés et cuisinés à la commande.' },
];

export function HomeView(props: HomeViewProps) {
  const { restaurant, slug, featured } = props;
  const cfg = restaurant.site_config ?? {};
  const menuHref = `/r/${slug}/menu`;
  const heroTitle = cfg.hero_title || restaurant.name;
  const heroSubtitle =
    cfg.hero_subtitle ||
    restaurant.description ||
    'Découvrez notre carte et commandez en quelques clics, livré chez vous.';
  const ctaLabel = cfg.hero_cta || 'Voir le menu';
  const highlights = cfg.highlights?.length ? cfg.highlights : DEFAULT_HIGHLIGHTS;

  return (
    <main>
      <Hero {...props} heroTitle={heroTitle} heroSubtitle={heroSubtitle} ctaLabel={ctaLabel} menuHref={menuHref} />

      {/* ── Highlights ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.slice(0, 3).map((h, i) => (
            <div
              key={i}
              className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-7"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--site-radius)] bg-[var(--site-accent)] text-[color:var(--site-accent-fg)]">
                {[<Truck key="a" className="h-5 w-5" />, <ShoppingBag key="b" className="h-5 w-5" />, <Sparkles key="c" className="h-5 w-5" />][i] ?? <Sparkles className="h-5 w-5" />}
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-site-heading)] text-lg font-bold">
                {h.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--site-muted)]">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── À propos ── */}
      {(cfg.about_text || cfg.about_image_url) && (
        <section className="bg-[var(--site-surface)]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
            <div className={cfg.about_image_url ? '' : 'md:col-span-2 md:max-w-2xl'}>
              <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--site-accent)]">
                Notre histoire
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-site-heading)] text-3xl font-bold md:text-4xl">
                {cfg.about_title || 'À propos de nous'}
              </h2>
              <p className="mt-5 whitespace-pre-line leading-relaxed text-[color:var(--site-muted)]">
                {cfg.about_text}
              </p>
            </div>
            {cfg.about_image_url && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)]">
                <Image src={cfg.about_image_url} alt="" fill className="object-cover" sizes="(min-width:768px) 50vw, 100vw" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Menu preview ── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--site-accent)]">
                Notre carte
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-site-heading)] text-3xl font-bold md:text-4xl">
                Les incontournables
              </h2>
            </div>
            <Link
              href={menuHref}
              className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-[color:var(--site-accent)] hover:underline md:inline-flex"
            >
              Tout le menu <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <Link
                key={item.id}
                href={menuHref}
                className="group overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] transition-transform hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--site-bg)]">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[color:var(--site-muted)]">
                      <ShoppingBag className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-[family-name:var(--font-site-heading)] text-base font-bold">
                      {item.name}
                    </h3>
                    <span className="shrink-0 font-semibold text-[color:var(--site-accent)]">
                      {formatPrice(item.promo_price ?? item.price)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-[color:var(--site-muted)]">
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link href={menuHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--site-accent)]">
              Tout le menu <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Galerie ── */}
      {cfg.gallery && cfg.gallery.length > 0 && (
        <section className="bg-[var(--site-surface)] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-center font-[family-name:var(--font-site-heading)] text-3xl font-bold">
              En images
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {cfg.gallery.slice(0, 8).map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)]"
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="(min-width:768px) 25vw, 50vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6">
          <h2 className="font-[family-name:var(--font-site-heading)] text-3xl font-bold md:text-5xl">
            Une petite faim ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base opacity-80">
            Parcourez notre menu et commandez en quelques secondes. Livraison à votre porte.
          </p>
          <Link
            href={menuHref}
            className="mt-8 inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-8 py-4 text-base font-bold text-[color:var(--site-accent-fg)] transition-transform hover:scale-105"
          >
            <ShoppingBag className="h-5 w-5" />
            Commander maintenant
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ── HERO (7 variantes) ─────────────────────────────────────────── */

interface HeroProps extends HomeViewProps {
  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
  menuHref: string;
}

function HeroMeta({ restaurant, estimatedDeliveryTime, avgRating, reviewCount }: HeroProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm opacity-90">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-4 w-4" /> ~{estimatedDeliveryTime} min
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Truck className="h-4 w-4" />
        {restaurant.delivery_fee === 0 ? 'Livraison offerte' : formatPrice(restaurant.delivery_fee)}
      </span>
      {avgRating !== null && (
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-current" /> {avgRating.toFixed(1)} ({reviewCount})
        </span>
      )}
    </div>
  );
}

function PrimaryCta({ href, label }: { href: string; label: string }) {
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

function Hero(props: HeroProps) {
  const { template, restaurant, heroTitle, heroSubtitle, ctaLabel, menuHref } = props;
  const cover = restaurant.cover_url;

  switch (template.heroStyle) {
    /* 1. Saveur — split image/texte */
    case 'split':
      return (
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:px-6 md:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--site-accent)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--site-accent)]">
              <Sparkles className="h-3.5 w-3.5" /> {restaurant.city || 'Livraison à domicile'}
            </span>
            <h1 className="mt-5 font-[family-name:var(--font-site-heading)] text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[color:var(--site-muted)]">
              {heroSubtitle}
            </p>
            <div className="mt-7">
              <PrimaryCta href={menuHref} label={ctaLabel} />
            </div>
            <div className="mt-8 text-[color:var(--site-text)]">
              <HeroMeta {...props} />
            </div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)] md:aspect-[4/5]">
            {cover ? (
              <Image src={cover} alt={restaurant.name} fill priority className="object-cover" sizes="(min-width:768px) 50vw, 100vw" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[var(--site-accent)] to-[var(--site-hero-bg)]" />
            )}
          </div>
        </section>
      );

    /* 2. Trattoria — centré sur fond doux */
    case 'centered':
      return (
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
            <span className="font-[family-name:var(--font-site-heading)] text-sm uppercase tracking-[0.3em] text-[color:var(--site-accent)]">
              Bienvenue
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-site-heading)] text-5xl font-bold leading-tight md:text-7xl">
              {heroTitle}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg italic leading-relaxed text-[color:var(--site-muted)]">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex justify-center">
              <PrimaryCta href={menuHref} label={ctaLabel} />
            </div>
            <div className="mt-8 flex justify-center text-[color:var(--site-text)]">
              <HeroMeta {...props} />
            </div>
          </div>
          {cover && (
            <div className="relative mx-auto h-64 max-w-5xl overflow-hidden rounded-t-[var(--site-radius)] md:h-96">
              <Image src={cover} alt={restaurant.name} fill priority className="object-cover" sizes="100vw" />
            </div>
          )}
        </section>
      );

    /* 3. Noir — image plein écran sombre */
    case 'fullbleed':
      return (
        <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden">
          {cover ? (
            <Image src={cover} alt={restaurant.name} fill priority className="object-cover" sizes="100vw" />
          ) : (
            <div className="absolute inset-0 bg-[var(--site-hero-bg)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/40" />
          <div className="relative mx-auto max-w-3xl px-4 text-center text-white">
            <span className="font-[family-name:var(--font-site-heading)] text-sm uppercase tracking-[0.4em] text-[var(--site-accent)]">
              {restaurant.city || 'Gastronomie'}
            </span>
            <h1 className="mt-5 font-[family-name:var(--font-site-heading)] text-5xl font-bold leading-tight md:text-7xl">
              {heroTitle}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">{heroSubtitle}</p>
            <div className="mt-9 flex justify-center">
              <PrimaryCta href={menuHref} label={ctaLabel} />
            </div>
          </div>
        </section>
      );

    /* 4. Urban — gros titre + bloc coloré */
    case 'bold':
      return (
        <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="grid items-center gap-8 md:grid-cols-5">
            <div className="md:col-span-3">
              <h1 className="font-[family-name:var(--font-site-heading)] text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-8xl">
                {heroTitle}
              </h1>
              <div className="mt-6 inline-block rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 py-2 text-base font-bold text-[color:var(--site-accent-fg)]">
                {heroSubtitle}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <PrimaryCta href={menuHref} label={ctaLabel} />
                <div className="text-[color:var(--site-text)]">
                  <HeroMeta {...props} />
                </div>
              </div>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-[var(--site-radius)] md:col-span-2">
              {cover ? (
                <Image src={cover} alt={restaurant.name} fill priority className="object-cover" sizes="(min-width:768px) 40vw, 100vw" />
              ) : (
                <div className="h-full w-full bg-[var(--site-accent)]" />
              )}
            </div>
          </div>
        </section>
      );

    /* 5. Pure — minimaliste */
    case 'minimal':
      return (
        <section className="mx-auto max-w-5xl px-4 py-24 md:px-6 md:py-36">
          <h1 className="font-[family-name:var(--font-site-heading)] text-5xl font-semibold leading-[1.02] tracking-tight md:text-8xl">
            {heroTitle}
          </h1>
          <div className="mt-8 flex flex-col gap-6 border-t border-[var(--site-border)] pt-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-md text-lg text-[color:var(--site-muted)]">{heroSubtitle}</p>
            <PrimaryCta href={menuHref} label={ctaLabel} />
          </div>
          {cover && (
            <div className="relative mt-12 aspect-[21/9] overflow-hidden">
              <Image src={cover} alt={restaurant.name} fill priority className="object-cover" sizes="100vw" />
            </div>
          )}
        </section>
      );

    /* 6. Riad — fond à motif oriental */
    case 'pattern':
      return (
        <section className="relative overflow-hidden bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, currentColor 1.5px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:px-6">
            <div>
              <span className="font-[family-name:var(--font-site-heading)] text-sm uppercase tracking-[0.3em] text-[var(--site-accent)]">
                {restaurant.city || 'Cuisine d’ici'}
              </span>
              <h1 className="mt-4 font-[family-name:var(--font-site-heading)] text-5xl leading-tight md:text-6xl">
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-md text-lg opacity-80">{heroSubtitle}</p>
              <div className="mt-8">
                <PrimaryCta href={menuHref} label={ctaLabel} />
              </div>
              <div className="mt-8">
                <HeroMeta {...props} />
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--site-radius)] ring-1 ring-[var(--site-accent)]/40">
              {cover ? (
                <Image src={cover} alt={restaurant.name} fill priority className="object-cover" sizes="(min-width:768px) 50vw, 100vw" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[var(--site-accent)]/40 to-transparent" />
              )}
            </div>
          </div>
        </section>
      );

    /* 7. Cocon — éditorial / magazine */
    case 'magazine':
    default:
      return (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-6">
              <span className="font-[family-name:var(--font-site-heading)] text-sm italic text-[color:var(--site-accent)]">
                {restaurant.city ? `À ${restaurant.city}` : 'Fait avec amour'}
              </span>
              <h1 className="mt-3 font-[family-name:var(--font-site-heading)] text-5xl font-semibold leading-[1.05] md:text-7xl">
                {heroTitle}
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-[color:var(--site-muted)]">
                {heroSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <PrimaryCta href={menuHref} label={ctaLabel} />
                <div className="text-[color:var(--site-text)]">
                  <HeroMeta {...props} />
                </div>
              </div>
            </div>
            <div className="md:col-span-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)] md:rotate-1">
                {cover ? (
                  <Image src={cover} alt={restaurant.name} fill priority className="object-cover" sizes="(min-width:768px) 50vw, 100vw" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[var(--site-accent)]/30 to-[var(--site-surface)]" />
                )}
              </div>
            </div>
          </div>
        </section>
      );
  }
}
