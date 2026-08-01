import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/templates';
import { SiteShell } from '@/components/site/site-shell';
import { HoursInfo } from '@/components/hours-info';
import type { OpeningHour, Restaurant } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('restaurants')
    .select('name, city')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Pick<Restaurant, 'name' | 'city'>>();
  if (!data) return { title: 'Introuvable' };
  const title = `Contact — ${data.name}`;
  const description = `Adresse, téléphone et horaires de ${data.name}${data.city ? ` à ${data.city}` : ''}. Commandez en ligne, livraison à domicile.`;
  return {
    title,
    description,
    alternates: { canonical: `/r/${slug}/contact` },
    openGraph: { title, description, url: `/r/${slug}/contact`, siteName: data.name, locale: 'fr_FR' },
  };
}

/** Extrait des coordonnées lat/lng d'un lien Google Maps (formats @, q=, !3d!4d, ll=). */
function extractLatLng(url: string): { lat: string; lng: string } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return { lat: m[1]!, lng: m[2]! };
  }
  return null;
}

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle<Restaurant>();

  if (!restaurant) notFound();

  const { data: hours } = await supabase
    .from('opening_hours')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('day_of_week')
    .returns<OpeningHour[]>();

  const template = getTemplate(restaurant.template_id);
  const cfg = restaurant.site_config ?? {};
  const social = cfg.social ?? {};
  const fullAddress = [restaurant.address, restaurant.city].filter(Boolean).join(', ');
  const searchQuery = fullAddress ? `${restaurant.name} ${fullAddress}` : restaurant.name;
  // Lien Google Maps précis fourni par le restaurateur (position exacte).
  const mapUrl = cfg.map_url ?? null;
  // Bouton « voir / itinéraire » : lien précis si fourni, sinon recherche par adresse.
  const mapsUrl =
    mapUrl ?? (fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}` : null);
  // Carte intégrée (sans clé API) : coordonnées extraites du lien si possible,
  // sinon requête par adresse.
  const coords = mapUrl ? extractLatLng(mapUrl) : null;
  const embedQuery = coords ? `${coords.lat},${coords.lng}` : fullAddress ? searchQuery : null;
  const embedUrl = embedQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(embedQuery)}&z=16&output=embed`
    : null;

  return (
    <SiteShell template={template} restaurant={restaurant} slug={slug}>
      <main className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-[color:var(--site-accent)]">
            Contact
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-site-heading)] text-4xl font-bold md:text-5xl">
            Nous trouver
          </h1>
          <p className="mt-4 text-lg text-[color:var(--site-muted)]">
            {cfg.contact_intro || `Une question, une envie ? ${restaurant.name} vous accueille et vous livre.`}
          </p>
        </header>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Coordonnées */}
          <div className="space-y-4 rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-7">
            <h2 className="font-[family-name:var(--font-site-heading)] text-xl font-bold">Coordonnées</h2>
            {fullAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--site-accent)]" />
                <div>
                  <p className="text-[color:var(--site-text)]">{fullAddress}</p>
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[color:var(--site-accent)] hover:underline">
                      Voir sur la carte →
                    </a>
                  )}
                </div>
              </div>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3 hover:opacity-80">
                <Phone className="h-5 w-5 shrink-0 text-[color:var(--site-accent)]" />
                <span>{restaurant.phone}</span>
              </a>
            )}
            {social.whatsapp && (
              <a href={social.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:opacity-80">
                <Mail className="h-5 w-5 shrink-0 text-[color:var(--site-accent)]" />
                <span>WhatsApp</span>
              </a>
            )}
            {(social.facebook || social.instagram) && (
              <div className="flex gap-3 pt-1">
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--site-radius)] border border-[var(--site-border)] hover:bg-[var(--site-bg)]"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--site-radius)] border border-[var(--site-border)] hover:bg-[var(--site-bg)]"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}

            <div className="pt-2">
              <Link
                href={`/r/${slug}/menu`}
                className="inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-6 py-3 text-sm font-bold text-[color:var(--site-accent-fg)] transition-transform hover:scale-105"
              >
                <ShoppingBag className="h-4 w-4" />
                Commander en ligne
              </Link>
            </div>
          </div>

          {/* Horaires */}
          <div className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-7">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-site-heading)] text-xl font-bold">
              <Clock className="h-5 w-5 text-[color:var(--site-accent)]" />
              Horaires
            </h2>
            <div className="mt-4">
              {(hours?.length ?? 0) > 0 ? (
                <HoursInfo hours={hours ?? []} />
              ) : (
                <p className="text-sm text-[color:var(--site-muted)]">
                  Horaires non renseignés. Contactez-nous pour plus d&apos;informations.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Carte de localisation */}
        {embedUrl && (
          <div className="mt-6 overflow-hidden rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--site-border)] px-5 py-4">
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-site-heading)] text-xl font-bold">
                <MapPin className="h-5 w-5 text-[color:var(--site-accent)]" />
                Où nous trouver
              </h2>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-4 py-2 text-sm font-bold text-[color:var(--site-accent-fg)] transition-opacity hover:opacity-90"
                >
                  <MapPin className="h-4 w-4" />
                  Itinéraire
                </a>
              )}
            </div>
            <iframe
              src={embedUrl}
              title={`Localisation de ${restaurant.name}`}
              className="h-[360px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        )}
      </main>
    </SiteShell>
  );
}
