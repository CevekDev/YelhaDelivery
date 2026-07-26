'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACCENT_PRESETS, accentForeground } from '@/lib/site-theme';
import { updateSiteAccentAction } from './actions';

export function SiteAccentPicker({
  initialAccent,
  templateAccent,
}: {
  initialAccent: string;
  templateAccent: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialAccent); // '' = défaut du template
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pick = (value: string) => {
    setSelected(value);
    setSuccess(false);
    setError(null);
  };

  const save = () => {
    startTransition(async () => {
      setError(null);
      setSuccess(false);
      const fd = new FormData();
      fd.set('accent', selected);
      const res = await updateSiteAccentAction(fd);
      if (!res.ok) setError(res.error ?? 'Enregistrement impossible.');
      else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choisissez la couleur de votre marque. Le texte des boutons s’adapte
        automatiquement pour rester lisible, et le style de votre modèle est préservé.
      </p>

      <div className="flex flex-wrap gap-3">
        <Swatch
          color={templateAccent}
          label="Défaut du modèle"
          selected={selected === ''}
          onClick={() => pick('')}
          ring
        />
        {ACCENT_PRESETS.map((p) => (
          <Swatch
            key={p.id}
            color={p.accent}
            label={p.name}
            selected={selected.toUpperCase() === p.accent.toUpperCase()}
            onClick={() => pick(p.accent)}
          />
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          ✓ Couleur enregistrée.
        </p>
      )}

      <Button type="button" onClick={save} disabled={isPending}>
        {isPending ? 'Enregistrement…' : 'Enregistrer la couleur'}
      </Button>
    </div>
  );
}

function Swatch({
  color,
  label,
  selected,
  onClick,
  ring,
}: {
  color: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  ring?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={
        'relative h-11 w-11 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
        (selected ? 'ring-2 ring-foreground ring-offset-2' : '') +
        (ring ? ' border-2 border-dashed border-border' : '')
      }
      style={{ backgroundColor: color }}
    >
      {selected && (
        <Check
          className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
          style={{ color: accentForeground(color) }}
          strokeWidth={3}
        />
      )}
    </button>
  );
}
