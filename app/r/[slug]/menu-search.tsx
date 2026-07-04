'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Barre de recherche live pour le menu — style UberEats.
 * Filtre côté client en manipulant l'attribut `data-menu-item` sur chaque
 * item et cache les sections vides (data-menu-section). Aucun state global,
 * uniquement du DOM query pour rester perfectible avec un menu SSR.
 */
export function MenuSearch({ placeholder = 'Rechercher un plat…' }: { placeholder?: string }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = q.trim().toLowerCase();
    const items = document.querySelectorAll<HTMLElement>('[data-menu-item]');
    if (!query) {
      items.forEach((el) => (el.style.display = ''));
      document
        .querySelectorAll<HTMLElement>('[data-menu-section]')
        .forEach((el) => (el.style.display = ''));
      return;
    }
    items.forEach((el) => {
      const name = el.dataset.menuItem?.toLowerCase() ?? '';
      const desc = el.dataset.menuDesc?.toLowerCase() ?? '';
      el.style.display = name.includes(query) || desc.includes(query) ? '' : 'none';
    });
    // Cache les sections dont tous les items sont hidden.
    document.querySelectorAll<HTMLElement>('[data-menu-section]').forEach((sec) => {
      const visible = sec.querySelectorAll<HTMLElement>(
        '[data-menu-item]:not([style*="display: none"])',
      );
      sec.style.display = visible.length === 0 ? 'none' : '';
    });
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-3 pt-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--site-muted)]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-[var(--site-border)] bg-[var(--site-surface)] pl-10 pr-10 text-sm text-[color:var(--site-text)] placeholder:text-[color:var(--site-muted)] focus:border-[color:var(--site-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--site-accent)]/20"
          aria-label={placeholder}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--site-bg)] text-[color:var(--site-muted)] hover:opacity-80"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
