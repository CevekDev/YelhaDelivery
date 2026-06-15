import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, CreditCard, Leaf, ShoppingBag, Sparkles, Star, Truck, UtensilsCrossed } from 'lucide-react';
import type { MenuItem, Restaurant } from '@/types/database';
import type { HeroStyle, Template } from '@/lib/templates';
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

interface Highlight {
  title: string;
  text: string;
}

const DEFAULT_HIGHLIGHTS: Highlight[] = [
  { title: 'Livraison rapide', text: 'Vos plats préparés et livrés chauds, en un temps record.' },
  { title: 'Paiement à la livraison', text: 'Payez en espèces à réception. Simple et sans risque.' },
  { title: 'Fraîcheur garantie', text: 'Des produits sélectionnés et cuisinés à la commande.' },
];

const HIGHLIGHT_ICONS = [Truck, CreditCard, Leaf];

function highlightIcon(i: number) {
  const Icon = HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length] ?? Sparkles;
  return Icon;
}

type SectionKey = 'highlights' | 'about' | 'menu' | 'gallery';

/**
 * Ordre des sections propre à chaque template — c'est ce qui casse la
 * monotonie « même scroll partout ». Le hero ouvre et le CTA ferme toujours ;
 * seul le corps est réordonné selon la personnalité du modèle.
 */
const SECTION_ORDER: Record<HeroStyle, SectionKey[]> = {
  split: ['menu', 'about', 'highlights', 'gallery'], // Saveur — l'appétit d'abord
  centered: ['about', 'menu', 'highlights', 'gallery'], // Trattoria — l'histoire d'abord
  fullbleed: ['menu', 'about', 'gallery', 'highlights'], // Noir — la carte d'abord
  bold: ['menu', 'gallery', 'highlights', 'about'], // Urban — punchy, food-forward
  minimal: ['about', 'menu', 'gallery', 'highlights'], // Pure — éditorial posé
  pattern: ['about', 'menu', 'highlights', 'gallery'], // Riad — héritage puis carte
  magazine: ['gallery', 'menu', 'about', 'highlights'], // Cocon — visuel magazine d'abord
  editorial: ['menu', 'highlights', 'about', 'gallery'], // Audace — la carte d'abord, punchy
};

export function HomeView(props: HomeViewProps) {
  const { template, restaurant, slug, featured } = props;
  const cfg = restaurant.site_config ?? {};
  const menuHref = `/r/${slug}/menu`;
  const heroTitle = cfg.hero_title || restaurant.name;
  const heroSubtitle =
    cfg.hero_subtitle ||
    restaurant.description ||
    'Découvrez notre carte et commandez en quelques clics, livré chez vous.';
  const ctaLabel = cfg.hero_cta || 'Voir le menu';
  const highlights = (cfg.highlights?.length ? cfg.highlights : DEFAULT_HIGHLIGHTS).slice(0, 3);
  const gallery = cfg.gallery?.slice(0, 8) ?? [];
  const hasAbout = Boolean(cfg.about_text || cfg.about_image_url);

  function renderSection(key: SectionKey) {
    switch (key) {
      case 'highlights':
        return <Highlights key="highlights" template={template} highlights={highlights} />;
      case 'about':
        return hasAbout ? (
          <About
            key="about"
            template={template}
            title={cfg.about_title || 'À propos de nous'}
            text={cfg.about_text || ''}
            imageUrl={cfg.about_image_url}
          />
        ) : null;
      case 'menu':
        return featured.length > 0 ? (
          <MenuPreview key="menu" template={template} featured={featured} menuHref={menuHref} />
        ) : null;
      case 'gallery':
        return gallery.length > 0 ? (
          <Gallery key="gallery" template={template} gallery={gallery} />
        ) : null;
    }
  }

  return (
    <main>
      <Hero {...props} heroTitle={heroTitle} heroSubtitle={heroSubtitle} ctaLabel={ctaLabel} menuHref={menuHref} />
      {SECTION_ORDER[template.heroStyle].map(renderSection)}
      <FinalCta template={template} menuHref={menuHref} restaurant={restaurant} />
    </main>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HIGHLIGHTS — « atouts » uniques par template
   ════════════════════════════════════════════════════════════════════ */

function Highlights({ template, highlights }: { template: Template; highlights: Highlight[] }) {
  switch (template.heroStyle) {
    /* Saveur — bande d'atouts énergique, cartes à accent latéral */
    case 'split':
      return (
        <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-16">
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((h, i) => {
              const Icon = highlightIcon(i);
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-[var(--site-radius)] border-l-4 border-[var(--site-accent)] bg-[var(--site-surface)] p-6"
                >
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent)] text-[color:var(--site-accent-fg)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-[family-name:var(--font-site-heading)] text-base font-bold">{h.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[color:var(--site-muted)]">{h.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );

    /* Trattoria — colonnes centrées séparées par des filets, esprit carte */
    case 'centered':
      return (
        <section className="border-y border-[var(--site-border)]">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 text-center md:grid-cols-3 md:divide-x md:divide-[var(--site-border)] md:px-6">
            {highlights.map((h, i) => (
              <div key={i} className="px-2">
                <span className="text-[color:var(--site-accent)]" aria-hidden>✦</span>
                <h3 className="mt-3 font-[family-name:var(--font-site-heading)] text-xl">{h.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm italic leading-relaxed text-[color:var(--site-muted)]">
                  {h.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      );

    /* Noir — labels small-caps épurés avec filet doré, aucun cadre */
    case 'fullbleed':
      return (
        <section className="bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-3 md:px-6 md:py-20">
            {highlights.map((h, i) => (
              <div key={i}>
                <div className="h-px w-12 bg-[var(--site-accent)]" />
                <p className="mt-5 font-[family-name:var(--font-site-heading)] text-xs uppercase tracking-[0.35em] text-[var(--site-accent)]">
                  0{i + 1}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-site-heading)] text-xl">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-85">{h.text}</p>
              </div>
            ))}
          </div>
        </section>
      );

    /* Urban + Audace — bandeau marquee défilant + atouts à gros chiffres */
    case 'editorial':
    case 'bold':
      return (
        <section className="overflow-hidden">
          <style>{`@keyframes yd-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
          <div className="border-y-2 border-[var(--site-text)] bg-[var(--site-accent)] py-3 text-[color:var(--site-accent-fg)]">
            <div
              className="flex w-max gap-8 whitespace-nowrap"
              style={{ animation: 'yd-marquee 22s linear infinite' }}
            >
              {Array.from({ length: 2 }).map((_, dup) => (
                <div key={dup} className="flex gap-8" aria-hidden={dup === 1}>
                  {highlights.map((h, i) => (
                    <span
                      key={`${dup}-${i}`}
                      className="font-[family-name:var(--font-site-heading)] text-sm font-black uppercase tracking-wider"
                    >
                      ★ {h.title}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3 md:px-6">
            {highlights.map((h, i) => (
              <div key={i} className="rounded-[var(--site-radius)] bg-[var(--site-surface)] p-7">
                <span className="font-[family-name:var(--font-site-heading)] text-5xl font-black text-[var(--site-accent)]">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-site-heading)] text-lg font-black uppercase">
                  {h.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--site-muted)]">{h.text}</p>
              </div>
            ))}
          </div>
        </section>
      );

    /* Pure — liste numérotée minimaliste, filets fins, beaucoup de blanc */
    case 'minimal':
      return (
        <section className="mx-auto max-w-4xl px-4 py-20 md:px-6">
          <ul>
            {highlights.map((h, i) => (
              <li
                key={i}
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 border-t border-[var(--site-border)] py-7 md:grid-cols-[3rem_1fr_2fr]"
              >
                <span className="font-[family-name:var(--font-site-heading)] text-sm tabular-nums text-[color:var(--site-muted)]">
                  0{i + 1}
                </span>
                <h3 className="font-[family-name:var(--font-site-heading)] text-lg font-medium">{h.title}</h3>
                <p className="col-start-2 text-sm leading-relaxed text-[color:var(--site-muted)] md:col-start-3">
                  {h.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      );

    /* Riad — cartes encadrées avec motif pointillé et anneau doré */
    case 'pattern':
      return (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map((h, i) => {
              const Icon = highlightIcon(i);
              return (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-[var(--site-radius)] bg-[var(--site-surface)] p-7 ring-1 ring-[var(--site-accent)]/30"
                >
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 opacity-[0.12]"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 1px 1px, var(--site-accent) 1.5px, transparent 0)',
                      backgroundSize: '12px 12px',
                    }}
                  />
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--site-accent)]/40 text-[color:var(--site-accent)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-[family-name:var(--font-site-heading)] text-lg">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--site-muted)]">{h.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      );

    /* Cocon — éditorial avec grand chiffre serif et légende */
    case 'magazine':
    default:
      return (
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-20">
          <div className="space-y-10">
            {highlights.map((h, i) => (
              <div key={i} className="grid items-baseline gap-x-8 gap-y-2 md:grid-cols-[6rem_1fr]">
                <span className="font-[family-name:var(--font-site-heading)] text-6xl font-light leading-none text-[var(--site-accent)]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-site-heading)] text-2xl font-semibold">{h.title}</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-[color:var(--site-muted)]">{h.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
  }
}

/* ════════════════════════════════════════════════════════════════════
   ABOUT — 3 traitements selon la personnalité
   ════════════════════════════════════════════════════════════════════ */

function About({
  template,
  title,
  text,
  imageUrl,
}: {
  template: Template;
  title: string;
  text: string;
  imageUrl?: string;
}) {
  const style = template.heroStyle;

  /* Noir / Pure — texte centré épuré, pas de cadre */
  if (style === 'fullbleed' || style === 'minimal') {
    return (
      <section className="border-y border-[var(--site-border)]">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center md:px-6 md:py-28">
          <p className="font-[family-name:var(--font-site-heading)] text-xs uppercase tracking-[0.35em] text-[color:var(--site-accent)]">
            Notre histoire
          </p>
          <h2 className="mt-5 font-[family-name:var(--font-site-heading)] text-3xl font-semibold md:text-5xl">
            {title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl whitespace-pre-line text-lg leading-relaxed text-[color:var(--site-muted)]">
            {text}
          </p>
        </div>
      </section>
    );
  }

  /* Trattoria / Cocon — éditorial, image décalée et légende */
  if (style === 'centered' || style === 'magazine') {
    return (
      <section className="bg-[var(--site-surface)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          {imageUrl && (
            <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)] md:-rotate-1">
              <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(min-width:768px) 50vw, 100vw" />
            </div>
          )}
          <div className={imageUrl ? '' : 'md:col-span-2 md:mx-auto md:max-w-2xl md:text-center'}>
            <p className="font-[family-name:var(--font-site-heading)] text-sm italic text-[color:var(--site-accent)]">
              Notre histoire
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-site-heading)] text-3xl md:text-5xl">{title}</h2>
            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-[color:var(--site-muted)]">{text}</p>
          </div>
        </div>
      </section>
    );
  }

  /* Saveur / Urban / Riad — bloc image + texte classique */
  return (
    <section className="bg-[var(--site-surface)]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
        <div className={imageUrl ? '' : 'md:col-span-2 md:max-w-2xl'}>
          <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--site-accent)]">
            Notre histoire
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-site-heading)] text-3xl font-bold md:text-4xl">{title}</h2>
          <p className="mt-5 whitespace-pre-line leading-relaxed text-[color:var(--site-muted)]">{text}</p>
        </div>
        {imageUrl && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)]">
            <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(min-width:768px) 50vw, 100vw" />
          </div>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MENU PREVIEW — vitrine ou carte selon le template
   ════════════════════════════════════════════════════════════════════ */

function SectionEyebrow({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--site-accent)]">{kicker}</p>
      <h2 className="mt-2 font-[family-name:var(--font-site-heading)] text-3xl font-bold md:text-4xl">{title}</h2>
    </div>
  );
}

function MenuPreview({
  template,
  featured,
  menuHref,
}: {
  template: Template;
  featured: MenuItem[];
  menuHref: string;
}) {
  const style = template.heroStyle;

  /* Carte « price-leaders » à filets pointillés — Trattoria, Noir, Pure */
  if (style === 'centered' || style === 'fullbleed' || style === 'minimal') {
    const dark = style === 'fullbleed';
    return (
      <section className={dark ? 'bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]' : ''}>
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <div className="text-center">
            <p className="font-[family-name:var(--font-site-heading)] text-xs uppercase tracking-[0.35em] text-[color:var(--site-accent)]">
              Notre carte
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-site-heading)] text-3xl md:text-5xl">
              Les incontournables
            </h2>
          </div>
          <ul className="mt-12 space-y-6">
            {featured.map((item) => (
              <li key={item.id}>
                <Link href={menuHref} className="group block">
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-[family-name:var(--font-site-heading)] text-lg group-hover:text-[color:var(--site-accent)]">
                      {item.name}
                    </h3>
                    <span
                      className={`mx-1 flex-1 translate-y-[-2px] border-b border-dotted ${dark ? 'border-white/25' : 'border-[var(--site-border)]'}`}
                    />
                    <span className="font-[family-name:var(--font-site-heading)] text-lg font-semibold text-[color:var(--site-accent)]">
                      {formatPrice(item.promo_price ?? item.price)}
                    </span>
                  </div>
                  {item.description && (
                    <p className={`mt-1 max-w-lg text-sm ${dark ? 'opacity-80' : 'text-[color:var(--site-muted)]'}`}>
                      {item.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-center">
            <Link
              href={menuHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--site-accent)] hover:underline"
            >
              Voir toute la carte <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* Liste audacieuse à gros chiffres — Urban + Audace */
  if (style === 'bold' || style === 'editorial') {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <SectionEyebrow kicker="Best-sellers" title="Le menu qui déchire" />
        <ul className="mt-10 divide-y-2 divide-[var(--site-text)]">
          {featured.map((item, i) => (
            <li key={item.id}>
              <Link href={menuHref} className="group flex items-center gap-3 py-5 md:gap-5">
                <span className="font-[family-name:var(--font-site-heading)] text-2xl font-black text-[var(--site-accent)] sm:text-3xl md:text-4xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.image_url && (
                  <div className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-[var(--site-radius)] sm:block">
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <h3 className="min-w-0 flex-1 break-words font-[family-name:var(--font-site-heading)] text-lg font-black uppercase tracking-tight group-hover:text-[color:var(--site-accent)] sm:text-xl md:text-3xl">
                  {item.name}
                </h3>
                <span className="whitespace-nowrap font-[family-name:var(--font-site-heading)] text-lg font-black sm:text-xl md:text-3xl">
                  {formatPrice(item.promo_price ?? item.price)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  /* Éditorial 2 colonnes alternées — Cocon */
  if (style === 'magazine') {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <SectionEyebrow kicker="À déguster" title="Nos petites merveilles" />
        <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {featured.map((item, i) => (
            <Link key={item.id} href={menuHref} className={`group block ${i % 2 === 1 ? 'sm:mt-12' : ''}`}>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)]">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width:640px) 50vw, 100vw"
                  />
                ) : (
                  <MediaPlaceholder />
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <h3 className="font-[family-name:var(--font-site-heading)] text-xl">{item.name}</h3>
                <span className="font-[family-name:var(--font-site-heading)] text-[color:var(--site-accent)]">
                  {formatPrice(item.promo_price ?? item.price)}
                </span>
              </div>
              {item.description && (
                <p className="mt-1 text-sm italic leading-relaxed text-[color:var(--site-muted)]">{item.description}</p>
              )}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  /* Grille de cartes — Saveur (split) & Riad (pattern) */
  const framed = style === 'pattern';
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="flex items-end justify-between gap-4">
        <SectionEyebrow kicker="Notre carte" title="Les incontournables" />
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
            className={`group block overflow-hidden rounded-[var(--site-radius)] bg-[var(--site-surface)] transition-transform hover:-translate-y-1 ${
              framed ? 'ring-1 ring-[var(--site-accent)]/25' : 'border border-[var(--site-border)]'
            }`}
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
                <MediaPlaceholder />
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-[family-name:var(--font-site-heading)] text-base font-bold">{item.name}</h3>
                <span className="shrink-0 font-semibold text-[color:var(--site-accent)]">
                  {formatPrice(item.promo_price ?? item.price)}
                </span>
              </div>
              {item.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-[color:var(--site-muted)]">{item.description}</p>
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
  );
}

/* ════════════════════════════════════════════════════════════════════
   GALERIE — mosaïque ou bande selon le template
   ════════════════════════════════════════════════════════════════════ */

function Gallery({ template, gallery }: { template: Template; gallery: string[] }) {
  const style = template.heroStyle;

  /* Mosaïque asymétrique — magazine / split */
  if (style === 'magazine' || style === 'split') {
    return (
      <section className="bg-[var(--site-surface)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="font-[family-name:var(--font-site-heading)] text-3xl font-bold">En images</h2>
          <div className="mt-8 grid auto-rows-[140px] grid-cols-2 gap-3 md:auto-rows-[180px] md:grid-cols-4">
            {gallery.map((src, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)] ${
                  i % 5 === 0 ? 'row-span-2' : ''
                }`}
              >
                <Image src={src} alt={`Galerie — photo ${i + 1}`} fill className="object-cover" sizes="(min-width:768px) 25vw, 50vw" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* Grille uniforme centrée — autres */
  return (
    <section className="bg-[var(--site-surface)] py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="text-center font-[family-name:var(--font-site-heading)] text-3xl font-bold">En images</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {gallery.map((src, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)]"
            >
              <Image src={src} alt={`Galerie — photo ${i + 1}`} fill className="object-cover" sizes="(min-width:768px) 25vw, 50vw" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   CTA FINAL — distinct par template
   ════════════════════════════════════════════════════════════════════ */

function FinalCta({
  template,
  menuHref,
  restaurant,
}: {
  template: Template;
  menuHref: string;
  restaurant: Restaurant;
}) {
  const style = template.heroStyle;

  /* Urban + Audace — énorme bloc uppercase */
  if (style === 'bold' || style === 'editorial') {
    return (
      <section className="bg-[var(--site-accent)] text-[color:var(--site-accent-fg)]">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center md:px-6 md:py-28">
          <h2 className="font-[family-name:var(--font-site-heading)] text-5xl font-black uppercase leading-[0.9] md:text-8xl">
            On a faim ?
          </h2>
          <Link
            href={menuHref}
            className="mt-8 inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-text)] px-8 py-4 text-base font-black uppercase text-[var(--site-bg)] transition-transform hover:scale-105"
          >
            <ShoppingBag className="h-5 w-5" /> Commander
          </Link>
        </div>
      </section>
    );
  }

  /* Pure — une simple ligne soulignée */
  if (style === 'minimal') {
    return (
      <section className="border-t border-[var(--site-border)]">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-20 md:flex-row md:items-end md:justify-between md:px-6">
          <h2 className="font-[family-name:var(--font-site-heading)] text-3xl font-semibold md:text-5xl">
            Prêt à commander ?
          </h2>
          <Link
            href={menuHref}
            className="group inline-flex items-center gap-2 border-b-2 border-[var(--site-text)] pb-1 text-lg font-medium"
          >
            Voir le menu
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    );
  }

  /* Noir — bande sombre raffinée */
  if (style === 'fullbleed') {
    return (
      <section className="bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
          <p className="font-[family-name:var(--font-site-heading)] text-xs uppercase tracking-[0.4em] text-[var(--site-accent)]">
            Réservez votre table à la maison
          </p>
          <h2 className="mt-5 font-[family-name:var(--font-site-heading)] text-4xl md:text-6xl">
            Une expérience à savourer
          </h2>
          <Link
            href={menuHref}
            className="mt-9 inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-8 py-4 text-base font-semibold text-[color:var(--site-accent-fg)] transition-transform hover:scale-105"
          >
            Découvrir la carte
          </Link>
        </div>
      </section>
    );
  }

  /* Saveur / Trattoria / Riad / Cocon — bande hero classique */
  return (
    <section className="bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6">
        <h2 className="font-[family-name:var(--font-site-heading)] text-3xl font-bold md:text-5xl">Une petite faim ?</h2>
        <p className="mx-auto mt-4 max-w-xl text-base opacity-90">
          {restaurant.city
            ? `Livraison à ${restaurant.city} en quelques secondes. Parcourez notre menu.`
            : 'Parcourez notre menu et commandez en quelques secondes. Livraison à votre porte.'}
        </p>
        <Link
          href={menuHref}
          className="mt-8 inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-8 py-4 text-base font-bold text-[color:var(--site-accent-fg)] transition-transform hover:scale-105"
        >
          <ShoppingBag className="h-5 w-5" /> Commander maintenant
        </Link>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HERO — 7 variantes (inchangé)
   ════════════════════════════════════════════════════════════════════ */

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

/**
 * Placeholder élégant quand aucune photo n'est disponible — dégradé dérivé de
 * la palette du template + icône couverts. Évite les blocs de couleur « vides »
 * et donne un rendu intentionnel aux restaurants qui n'ont pas encore d'images.
 */
function MediaPlaceholder({ hero = false }: { hero?: boolean }) {
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
