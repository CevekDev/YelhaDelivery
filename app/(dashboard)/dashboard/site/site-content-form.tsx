'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateSiteContentAction } from './actions';
import type { SiteConfig } from '@/types/database';

export function SiteContentForm({ config }: { config: SiteConfig }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const social = config.social ?? {};
  const gallery = config.gallery ?? [];

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSuccess(false);
          setFieldErrors({});
          const res = await updateSiteContentAction(fd);
          if (!res.ok) {
            setError(res.error ?? null);
            setFieldErrors(res.fieldErrors ?? {});
          } else {
            setSuccess(true);
            router.refresh();
          }
        })
      }
      className="space-y-8"
    >
      {/* Hero */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold">Accroche (page d’accueil)</legend>
        <div className="space-y-2">
          <Label htmlFor="hero_title">Titre principal</Label>
          <Input id="hero_title" name="hero_title" maxLength={120} defaultValue={config.hero_title ?? ''} placeholder="Le meilleur de la cuisine, livré chez vous" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero_subtitle">Sous-titre</Label>
          <Textarea id="hero_subtitle" name="hero_subtitle" maxLength={300} rows={2} defaultValue={config.hero_subtitle ?? ''} placeholder="Une phrase qui donne envie de commander." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero_cta">Texte du bouton</Label>
          <Input id="hero_cta" name="hero_cta" maxLength={40} defaultValue={config.hero_cta ?? ''} placeholder="Voir le menu" />
        </div>
      </fieldset>

      {/* À propos */}
      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="text-sm font-bold">Notre histoire</legend>
        <div className="space-y-2">
          <Label htmlFor="about_title">Titre</Label>
          <Input id="about_title" name="about_title" maxLength={120} defaultValue={config.about_title ?? ''} placeholder="À propos de nous" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="about_text">Texte</Label>
          <Textarea id="about_text" name="about_text" maxLength={2000} rows={5} defaultValue={config.about_text ?? ''} placeholder="Racontez votre histoire, votre cuisine, vos valeurs…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="about_image">Image “à propos”</Label>
          {config.about_image_url && (
            <div className="flex items-center gap-3">
              <Image src={config.about_image_url} alt="" width={80} height={60} className="h-16 w-24 rounded-lg border border-border object-cover" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" name="remove_about_image" value="true" />
                Supprimer l’image actuelle
              </label>
            </div>
          )}
          <Input id="about_image" name="about_image" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
      </fieldset>

      {/* Galerie */}
      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="text-sm font-bold">Galerie photos (jusqu’à 8)</legend>
        {gallery.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {gallery.map((src, i) => (
                <Image key={i} src={src} alt="" width={72} height={72} className="h-18 w-18 rounded-lg border border-border object-cover" style={{ height: 72, width: 72 }} />
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="clear_gallery" value="true" />
              Vider la galerie existante
            </label>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="gallery_images">Ajouter des photos</Label>
          <Input id="gallery_images" name="gallery_images" type="file" multiple accept="image/jpeg,image/png,image/webp" />
        </div>
      </fieldset>

      {/* Contact + réseaux */}
      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="text-sm font-bold">Contact &amp; réseaux sociaux</legend>
        <div className="space-y-2">
          <Label htmlFor="contact_intro">Texte d’intro (page contact)</Label>
          <Textarea id="contact_intro" name="contact_intro" maxLength={500} rows={2} defaultValue={config.contact_intro ?? ''} placeholder="Une question, une envie ? Nous vous accueillons et vous livrons." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SocialInput name="facebook" label="Facebook (URL)" value={social.facebook} error={fieldErrors.facebook} />
          <SocialInput name="instagram" label="Instagram (URL)" value={social.instagram} error={fieldErrors.instagram} />
          <SocialInput name="tiktok" label="TikTok (URL)" value={social.tiktok} error={fieldErrors.tiktok} />
          <SocialInput name="whatsapp" label="WhatsApp (lien)" value={social.whatsapp} error={fieldErrors.whatsapp} />
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          ✓ Contenu enregistré.
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Enregistrement…' : 'Enregistrer le contenu'}
      </Button>
    </form>
  );
}

function SocialInput({
  name,
  label,
  value,
  error,
}: {
  name: string;
  label: string;
  value?: string;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="url" defaultValue={value ?? ''} placeholder="https://…" aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
