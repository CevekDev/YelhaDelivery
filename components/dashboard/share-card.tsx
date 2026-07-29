'use client';

import { useState } from 'react';
import { Check, Copy, Download, QrCode } from 'lucide-react';

/**
 * Carte « Partager ma page » : QR code (généré côté serveur, passé en SVG) +
 * copie du lien + téléchargement du QR pour flyers/vitrine/Instagram.
 */
export function ShareCard({ url, svg }: { url: string; svg: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function downloadQr() {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'yelha-qr-code.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/0 p-5 shadow-card">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
        <QrCode className="h-3.5 w-3.5" /> Partager ma page
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div
          className="h-24 w-24 shrink-0 rounded-xl border border-border bg-white p-1.5 [&>svg]:h-full [&>svg]:w-full"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-snug">
            Votre QR code prêt à imprimer
          </p>
          <p className="mt-1 break-all text-[11px] text-muted-foreground">{url}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
        <button
          type="button"
          onClick={downloadQr}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-dark"
        >
          <Download className="h-3.5 w-3.5" />
          Télécharger le QR
        </button>
      </div>
    </div>
  );
}
