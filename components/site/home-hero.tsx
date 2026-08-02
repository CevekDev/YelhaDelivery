import Image from 'next/image';
import { Clock, Sparkles, Star, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { type HomeViewProps, MediaPlaceholder, PrimaryCta } from './home-shared';

export interface HeroProps extends HomeViewProps {
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
        {Number(restaurant.delivery_fee) === 0 ? 'Livraison offerte' : formatPrice(restaurant.delivery_fee)}
      </span>
      {avgRating !== null && (
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-current" /> {avgRating.toFixed(1)} ({reviewCount})
        </span>
      )}
    </div>
  );
}

export function Hero(props: HeroProps) {
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
              <MediaPlaceholder hero />
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
            <>
              <div className="absolute inset-0 bg-[var(--site-hero-bg)]" />
              {/* lueur d'accent en haut pour éviter un fond totalement plat */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(ellipse 80% 60% at 50% -10%, var(--site-accent), transparent 70%)',
                }}
              />
            </>
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
              <h1 className="break-words font-[family-name:var(--font-site-heading)] text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-8xl">
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
                <MediaPlaceholder hero />
              )}
            </div>
          </div>
        </section>
      );

    /* 5. Pure — minimaliste */
    case 'minimal':
      return (
        <section className="mx-auto max-w-5xl px-4 py-24 md:px-6 md:py-36">
          <h1 className="break-words font-[family-name:var(--font-site-heading)] text-5xl font-semibold leading-[1.02] tracking-tight md:text-8xl">
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
                <MediaPlaceholder hero />
              )}
            </div>
          </div>
        </section>
      );

    /* 8. Audace — hero sombre éditorial, typo massive, badge, sans photo */
    case 'editorial':
      return (
        <section className="relative overflow-hidden bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]">
          <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--site-accent)]">
              ● {restaurant.city || 'Livraison à domicile'} — Ouvert
            </p>
            <h1 className="mt-5 max-w-3xl break-words font-[family-name:var(--font-site-heading)] text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-8xl">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed opacity-80 md:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <PrimaryCta href={menuHref} label={ctaLabel} />
              <HeroMeta {...props} />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute right-4 top-8 hidden h-28 w-28 rotate-12 flex-col items-center justify-center rounded-full bg-[var(--site-accent)] text-center font-[family-name:var(--font-site-heading)] text-sm font-black uppercase leading-tight text-[color:var(--site-accent-fg)] lg:flex"
            >
              Frais
              <br />
              du jour
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
                  <MediaPlaceholder hero />
                )}
              </div>
            </div>
          </div>
        </section>
      );
  }
}
