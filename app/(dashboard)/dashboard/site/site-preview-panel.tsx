'use client';

import { useState } from 'react';
import { ExternalLink, Eye, RefreshCw, Smartphone, Monitor } from 'lucide-react';

/**
 * Aperçu du site à côté de l'éditeur. Charge la route privée /site-preview
 * (mêmes composants que le site public) dans une iframe. Reflète le DERNIER
 * enregistrement : après avoir sauvegardé un bloc, cliquez « Rafraîchir ».
 */
export function SitePreviewPanel() {
  const [key, setKey] = useState(0);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Eye className="h-4 w-4 text-primary" />
          Aperçu
        </p>
        <div className="flex items-center gap-1">
          <div className="mr-1 flex items-center rounded-lg border border-border p-0.5">
            <DeviceBtn
              active={device === 'mobile'}
              onClick={() => setDevice('mobile')}
              label="Mobile"
              icon={<Smartphone className="h-3.5 w-3.5" />}
            />
            <DeviceBtn
              active={device === 'desktop'}
              onClick={() => setDevice('desktop')}
              label="Ordinateur"
              icon={<Monitor className="h-3.5 w-3.5" />}
            />
          </div>
          <button
            type="button"
            onClick={() => setKey((k) => k + 1)}
            aria-label="Rafraîchir l’aperçu"
            title="Rafraîchir l’aperçu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href="/site-preview"
            target="_blank"
            rel="noreferrer"
            aria-label="Ouvrir en plein écran"
            title="Ouvrir en plein écran"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="bg-muted/40 p-3">
        <div
          className={
            'mx-auto overflow-hidden rounded-xl border border-border bg-background transition-all ' +
            (device === 'mobile' ? 'max-w-[400px]' : 'max-w-full')
          }
        >
          <iframe
            key={key}
            src="/site-preview"
            title="Aperçu du site"
            className="h-[560px] w-full xl:h-[calc(100vh-11rem)]"
          />
        </div>
      </div>

      <p className="border-t border-border px-4 py-2 text-center text-[11px] text-muted-foreground">
        Reflète le dernier enregistrement — cliquez ↻ après avoir sauvegardé.
      </p>
    </div>
  );
}

function DeviceBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={
        'flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors ' +
        (active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')
      }
    >
      {icon}
    </button>
  );
}
