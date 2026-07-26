'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SECTION_LABELS, SECTION_HINTS, type SiteSection } from '@/lib/site-sections';
import { updateSiteLayoutAction } from './actions';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SiteLayoutEditor({ initialLayout }: { initialLayout: SiteSection[] }) {
  const router = useRouter();
  const [sections, setSections] = useState<SiteSection[]>(initialLayout);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty = () => {
    setSuccess(false);
    setError(null);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    dirty();
  };

  const toggle = (index: number) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s)));
    dirty();
  };

  const patchText = (index: number, patch: Partial<SiteSection>) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    dirty();
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
    dirty();
  };

  const addTextBlock = () => {
    setSections((prev) => [
      ...prev,
      { id: newId(), type: 'text', enabled: true, title: '', body: '', cta: false },
    ]);
    dirty();
  };

  const textCount = sections.filter((s) => s.type === 'text').length;

  const save = () => {
    startTransition(async () => {
      setError(null);
      setSuccess(false);
      const fd = new FormData();
      fd.set('layout', JSON.stringify(sections));
      const res = await updateSiteLayoutAction(fd);
      if (!res.ok) {
        setError(res.error ?? 'Enregistrement impossible.');
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        La bannière d’accueil (en haut) et le bouton d’appel final (en bas) restent
        toujours en place. Vous organisez ici tout ce qui se trouve entre les deux.
      </p>

      <ul className="space-y-3">
        {sections.map((s, i) => {
          const isText = s.type === 'text';
          return (
            <li
              key={s.id}
              className={
                'rounded-xl border bg-background p-3 transition-colors ' +
                (s.enabled ? 'border-border' : 'border-dashed border-border bg-muted/30')
              }
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {isText && <Type className="h-3.5 w-3.5 text-primary" aria-hidden />}
                    {isText ? s.title?.trim() || 'Bloc de texte' : SECTION_LABELS[s.type]}
                    {!s.enabled && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        masqué
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{SECTION_HINTS[s.type]}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn
                    label="Monter"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    icon={<ArrowUp className="h-4 w-4" />}
                  />
                  <IconBtn
                    label="Descendre"
                    disabled={i === sections.length - 1}
                    onClick={() => move(i, 1)}
                    icon={<ArrowDown className="h-4 w-4" />}
                  />
                  <IconBtn
                    label={s.enabled ? 'Masquer' : 'Afficher'}
                    onClick={() => toggle(i)}
                    active={s.enabled}
                    icon={s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  />
                  {isText && (
                    <IconBtn
                      label="Supprimer ce bloc"
                      onClick={() => removeSection(i)}
                      danger
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  )}
                </div>
              </div>

              {isText && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`title-${s.id}`}>Titre</Label>
                    <Input
                      id={`title-${s.id}`}
                      value={s.title ?? ''}
                      maxLength={120}
                      onChange={(e) => patchText(i, { title: e.target.value })}
                      placeholder="Ex : Nos engagements"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`body-${s.id}`}>Texte</Label>
                    <Textarea
                      id={`body-${s.id}`}
                      value={s.body ?? ''}
                      maxLength={2000}
                      rows={3}
                      onChange={(e) => patchText(i, { body: e.target.value })}
                      placeholder="Le message que vous voulez faire passer…"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={!!s.cta}
                      onChange={(e) => patchText(i, { cta: e.target.checked })}
                    />
                    Afficher un bouton « Voir le menu » sous ce bloc
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={addTextBlock}
          disabled={textCount >= 8}
        >
          <Plus className="h-4 w-4" />
          Ajouter un bloc de texte
        </Button>
        {textCount >= 8 && (
          <span className="text-xs text-muted-foreground">Maximum 8 blocs de texte.</span>
        )}
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
          ✓ Agencement enregistré.
        </p>
      )}

      <Button type="button" onClick={save} disabled={isPending}>
        {isPending ? 'Enregistrement…' : 'Enregistrer l’agencement'}
      </Button>
    </div>
  );
}

function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  active,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-30 ' +
        (danger
          ? 'border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive'
          : active
            ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
            : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground')
      }
    >
      {icon}
    </button>
  );
}
