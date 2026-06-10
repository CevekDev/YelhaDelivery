import Link from 'next/link';
import { Facebook, Instagram, MapPin, Phone } from 'lucide-react';
import type { Restaurant } from '@/types/database';
import type { Template } from '@/lib/templates';
import { templateCssVars } from '@/lib/templates';
import { SiteNav, type SiteNavLink } from './site-nav';

/** Construit la liste des liens de navigation selon les pages activées. */
export function buildSiteLinks(slug: string, restaurant: Restaurant): SiteNavLink[] {
  const links: SiteNavLink[] = [];
  if (restaurant.home_enabled) links.push({ href: `/r/${slug}`, label: 'Accueil' });
  links.push({ href: `/r/${slug}/menu`, label: 'Menu' });
  if (restaurant.blog_enabled) links.push({ href: `/r/${slug}/blog`, label: 'Blog' });
  links.push({ href: `/r/${slug}/contact`, label: 'Contact' });
  return links;
}

export function SiteShell({
  template,
  restaurant,
  slug,
  children,
}: {
  template: Template;
  restaurant: Restaurant;
  slug: string;
  children: React.ReactNode;
}) {
  const links = buildSiteLinks(slug, restaurant);
  const social = restaurant.site_config?.social ?? {};
  const year = new Date().getFullYear();

  return (
    <div
      style={templateCssVars(template) as React.CSSProperties}
      className="min-h-screen bg-[var(--site-bg)] font-[family-name:var(--font-site-body)] text-[color:var(--site-text)] antialiased"
    >
      <SiteNav
        brand={restaurant.name}
        logoUrl={restaurant.logo_url}
        links={links}
        orderHref={`/r/${slug}/menu`}
      />

      {children}

      {/* Footer */}
      <footer className="border-t border-[var(--site-border)] bg-[var(--site-hero-bg)] text-[color:var(--site-hero-fg)]">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="font-[family-name:var(--font-site-heading)] text-xl font-bold">
                {restaurant.name}
              </p>
              {restaurant.description && (
                <p className="mt-3 max-w-xs text-sm opacity-70">{restaurant.description}</p>
              )}
            </div>

            <div className="space-y-2 text-sm opacity-80">
              {(restaurant.address || restaurant.city) && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{[restaurant.address, restaurant.city].filter(Boolean).join(', ')}</span>
                </p>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 hover:opacity-100">
                  <Phone className="h-4 w-4 shrink-0" />
                  {restaurant.phone}
                </a>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold opacity-90">Navigation</p>
              <ul className="mt-3 space-y-1.5 text-sm opacity-70">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:opacity-100">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {(social.facebook || social.instagram) && (
                <div className="mt-4 flex gap-3">
                  {social.facebook && (
                    <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                      <Facebook className="h-5 w-5 opacity-70 hover:opacity-100" />
                    </a>
                  )}
                  {social.instagram && (
                    <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                      <Instagram className="h-5 w-5 opacity-70 hover:opacity-100" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-current/10 pt-6 text-xs opacity-60 sm:flex-row">
            <p>
              © {year} {restaurant.name}. Tous droits réservés.
            </p>
            <p>
              Propulsé par{' '}
              <Link href="/" className="font-semibold hover:opacity-100">
                YelhaDelivery
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
