'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Globe, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TEMPLATES } from '@/lib/templates';
import { updateSiteSettingsAction } from './actions';

export function SiteSettingsForm({
  initialTemplateId,
  initialHome,
  initialBlog,
}: {
  initialTemplateId: number;
  initialHome: boolean;
  initialBlog: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [home, setHome] = useState(initialHome);
  const [blog, setBlog] = useState(initialBlog);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit() {
    startTransition(async () => {
      setError(null);
      setSuccess(false);
      const fd = new FormData();
      fd.set('template_id', String(templateId));
      fd.set('home_enabled', String(home));
      fd.set('blog_enabled', String(blog));
      const res = await updateSiteSettingsAction(fd);
      if (!res.ok) setError(res.error ?? 'Erreur');
      else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Galerie de templates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const selected = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={
                'group relative overflow-hidden rounded-2xl border text-left transition-all ' +
                (selected
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-primary/40')
              }
            >
              {selected && (
                <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              {/* Mini-aperçu */}
              <div
                className="p-5"
                style={{ backgroundColor: t.palette.bg, color: t.palette.text }}
              >
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{ color: t.palette.accent, fontFamily: t.fonts.body }}
                >
                  {t.tagline}
                </p>
                <p
                  className="mt-1 text-2xl font-bold leading-tight"
                  style={{ fontFamily: t.fonts.heading }}
                >
                  {t.name}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="rounded-md px-3 py-1.5 text-xs font-semibold"
                    style={{ backgroundColor: t.palette.accent, color: t.palette.accentText }}
                  >
                    Commander
                  </span>
                  <span
                    className="rounded-md px-2 py-1.5 text-xs"
                    style={{
                      border: `1px solid ${t.palette.border}`,
                      color: t.palette.textMuted,
                      fontFamily: t.fonts.body,
                    }}
                  >
                    Menu
                  </span>
                </div>
              </div>
              {/* Légende */}
              <div className="border-t border-border bg-background p-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.bestFor}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pages activées */}
      <div className="grid gap-3 sm:grid-cols-2">
        <PageToggle
          icon={<Globe className="h-5 w-5" />}
          title="Page d’accueil"
          description="Une vitrine avec hero, histoire et plats phares. Si désactivée, le menu s’affiche directement."
          checked={home}
          onChange={setHome}
        />
        <PageToggle
          icon={<Newspaper className="h-5 w-5" />}
          title="Blog"
          description="Publiez des articles (actualités, recettes). Gérez-les dans la section Blog."
          checked={blog}
          onChange={setBlog}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          ✓ Site mis à jour.
        </p>
      )}

      <Button onClick={submit} disabled={isPending}>
        {isPending ? 'Enregistrement…' : 'Enregistrer le design'}
      </Button>
    </div>
  );
}

function PageToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ' +
        (checked ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/50')
      }
    >
      <span className={'mt-0.5 ' + (checked ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
      <span className="flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span
            className={
              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ' +
              (checked ? 'bg-primary' : 'bg-muted-foreground/30')
            }
          >
            <span
              className={
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' +
                (checked ? 'translate-x-4' : 'translate-x-0.5')
              }
            />
          </span>
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
