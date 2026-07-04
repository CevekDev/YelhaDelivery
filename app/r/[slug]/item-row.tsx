'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';
import type { MenuItem, MenuItemVariant } from '@/types/database';

/* ═══════════════════════════════════════════════════════════
   ItemRow — carte horizontale style food-delivery
   Image carrée à droite, prix orange, bouton + orange
═══════════════════════════════════════════════════════════ */
export function ItemRow({
  item,
  slug,
  canOrder,
  availableExtras,
  availableVariants,
  freeExtraIds = [],
  extra: isExtraItem,
  suggestedDrinks = [],
  suggestedDesserts = [],
}: {
  item: MenuItem;
  slug: string;
  canOrder: boolean;
  availableExtras: MenuItem[];
  availableVariants: MenuItemVariant[];
  freeExtraIds?: string[];
  extra?: boolean;
  suggestedDrinks?: MenuItem[];
  suggestedDesserts?: MenuItem[];
}) {
  const [showModal, setShowModal] = useState(false);

  const lines = useCart(useShallow((s) => s.lines.filter((l) => l.menu_item_id === item.id)));
  const totalQty = lines.reduce((n, l) => n + l.quantity, 0);
  const singleLine = lines.length === 1 ? lines[0] : null;

  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);

  const disabled = !item.is_available || !canOrder;
  const activePrice = item.promo_price ?? item.price;
  const discount =
    item.promo_price != null
      ? Math.round(((item.price - item.promo_price) / item.price) * 100)
      : 0;

  const hasExtras = availableExtras.length > 0 && !isExtraItem;
  const hasVariants = availableVariants.length > 0 && !isExtraItem;
  const hasSuggestions =
    !isExtraItem && (suggestedDrinks.length > 0 || suggestedDesserts.length > 0);
  // La modale s'ouvre s'il y a des choix (extras/variantes), une note à saisir,
  // ou des suggestions à proposer.
  const needsModal = hasExtras || hasVariants || hasSuggestions;

  const isOffer = item.item_type === 'offer';

  const handleAdd = () => {
    if (disabled) return;
    if (needsModal) {
      setShowModal(true);
    } else {
      add(slug, {
        menu_item_id: item.id,
        variant_id: null,
        variant_name: null,
        name: item.name,
        price: Number(activePrice),
        note: null,
      });
    }
  };

  // Ouvrir la modale au clic sur la zone texte quand il y a des choix à faire.
  const openIfHasChoices = () => {
    if (disabled) return;
    if (needsModal) setShowModal(true);
  };
  const leftClickable = !disabled && needsModal;

  return (
    <>
      <div
        className={
          'mx-4 flex items-start gap-3 rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-3 transition-opacity ' +
          (disabled ? 'opacity-60' : '') +
          (isOffer ? ' ring-1 ring-amber-400/50' : '')
        }
      >
        {/* ── Left: text + price ── */}
        <div
          onClick={leftClickable ? openIfHasChoices : undefined}
          onKeyDown={
            leftClickable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openIfHasChoices();
                  }
                }
              : undefined
          }
          role={leftClickable ? 'button' : undefined}
          tabIndex={leftClickable ? 0 : undefined}
          aria-label={leftClickable ? `Personnaliser ${item.name}` : undefined}
          className={
            'flex min-w-0 flex-1 flex-col rounded-lg ' +
            (leftClickable ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--site-accent)]' : '')
          }
        >
          {/* Offer badge */}
          {isOffer && item.offer_badge && (
            <span className="mb-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
              🎁 {item.offer_badge}
            </span>
          )}

          {/* Nom + badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-bold leading-snug text-[color:var(--site-text)]">{item.name}</p>
            {discount > 0 && (
              <span className="rounded-full bg-[var(--site-accent)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--site-accent-fg)]">
                -{discount}%
              </span>
            )}
            {!item.is_available && (
              <span className="rounded-full bg-[var(--site-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--site-muted)]">
                Indisponible
              </span>
            )}
          </div>

          {/* Description ou offer_description */}
          {isOffer && item.offer_description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-amber-700/80">
              {item.offer_description}
            </p>
          ) : item.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--site-muted)]">
              {item.description}
            </p>
          ) : null}

          {/* Variant / extras hint */}
          {hasVariants && (
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--site-accent)]">
              {availableVariants.length} taille{availableVariants.length > 1 ? 's' : ''} disponible
              {availableVariants.length > 1 ? 's' : ''}
            </p>
          )}
          {!hasVariants && hasExtras && (
            <p className="mt-1 text-[11px] font-semibold text-[color:var(--site-accent)]">
              {availableExtras.length} option{availableExtras.length > 1 ? 's' : ''} disponible
              {availableExtras.length > 1 ? 's' : ''}
            </p>
          )}

          {/* Price */}
          <div className="mt-auto flex items-baseline gap-1.5 pt-3">
            <span className="font-[family-name:var(--font-site-heading)] text-[15px] font-extrabold text-[color:var(--site-accent)] tabular-nums">
              {isExtraItem ? '+' : ''}
              {formatPrice(activePrice)}
            </span>
            {item.promo_price != null && (
              <span className="text-xs text-[color:var(--site-muted)] line-through tabular-nums">
                {formatPrice(item.price)}
              </span>
            )}
          </div>
        </div>

        {/* ── Right: image + controls ── */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Image (cliquable pour ouvrir la modale si options disponibles) */}
          <div
            onClick={leftClickable ? openIfHasChoices : undefined}
            onKeyDown={
              leftClickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openIfHasChoices();
                    }
                  }
                : undefined
            }
            role={leftClickable ? 'button' : undefined}
            tabIndex={leftClickable ? 0 : undefined}
            aria-label={leftClickable ? `Voir ${item.name}` : undefined}
            className={
              'relative h-[84px] w-[84px] overflow-hidden rounded-xl bg-[var(--site-bg)] ' +
              (leftClickable ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--site-accent)]' : '')
            }
          >
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="84px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl opacity-25">
                {isOffer ? '🎁' : '🍽️'}
              </div>
            )}
            {(item.image_urls?.length ?? 0) > 0 && (
              <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                {item.image_urls!.slice(0, 3).map((_, i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-white/80 shadow" />
                ))}
              </div>
            )}
          </div>

          {/* Add / Stepper controls */}
          {totalQty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={disabled}
              aria-label={`Ajouter ${item.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--site-accent)] text-[color:var(--site-accent-fg)] shadow-md transition-transform active:scale-90 disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : hasVariants ? (
            /* Multi-variant: badge + open modal */
            <div className="flex h-8 items-center gap-1 rounded-full bg-[var(--site-accent)] px-2.5 shadow-md">
              <span className="min-w-[18px] text-center text-xs font-bold text-[color:var(--site-accent-fg)] tabular-nums">
                {totalQty}×
              </span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                aria-label="Ajouter une variante"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
              >
                <Plus className="h-3 w-3 text-[color:var(--site-accent-fg)]" />
              </button>
            </div>
          ) : (
            /* Simple item: inline stepper */
            <div className="flex h-8 items-center rounded-full bg-[var(--site-accent)] px-1 shadow-md">
              <button
                type="button"
                onClick={() => singleLine && setQty(singleLine.cart_key, singleLine.quantity - 1)}
                aria-label="Diminuer"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--site-accent-fg)] transition-colors hover:bg-white/20"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[20px] text-center text-sm font-bold text-[color:var(--site-accent-fg)] tabular-nums">
                {totalQty}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (hasExtras) setShowModal(true);
                  else if (singleLine) setQty(singleLine.cart_key, singleLine.quantity + 1);
                }}
                aria-label="Augmenter"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--site-accent-fg)] transition-colors hover:bg-white/20"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal variantes + suppléments + suggestions */}
      {showModal && (
        <ItemModal
          item={item}
          availableExtras={availableExtras}
          availableVariants={availableVariants}
          freeExtraIds={freeExtraIds}
          suggestedDrinks={suggestedDrinks}
          suggestedDesserts={suggestedDesserts}
          slug={slug}
          canOrder={canOrder}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ItemModal — wizard bottom sheet
   Étape 1 : variantes + suppléments + note
   Étape 2 (optionnelle) : suggestions boissons
   Étape 3 (optionnelle) : suggestions desserts
═══════════════════════════════════════════════════════════ */
function ItemModal({
  item,
  availableExtras,
  availableVariants,
  freeExtraIds,
  suggestedDrinks,
  suggestedDesserts,
  slug,
  canOrder,
  onClose,
}: {
  item: MenuItem;
  availableExtras: MenuItem[];
  availableVariants: MenuItemVariant[];
  freeExtraIds: string[];
  suggestedDrinks: MenuItem[];
  suggestedDesserts: MenuItem[];
  slug: string;
  canOrder: boolean;
  onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set(freeExtraIds));
  const [gallery, setGallery] = useState(0);
  const [itemNote, setItemNote] = useState('');
  const [selectedDrinks, setSelectedDrinks] = useState<Map<string, number>>(new Map());
  const [selectedDesserts, setSelectedDesserts] = useState<Map<string, number>>(new Map());
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const hasVariants = availableVariants.length > 0;
  const allImages = [item.image_url, ...(item.image_urls ?? [])].filter(Boolean) as string[];
  const basePrice = hasVariants
    ? (selectedVariant?.price ?? null)
    : (item.promo_price ?? item.price);

  const extrasTotal = availableExtras
    .filter((e) => selectedExtras.has(e.id) && !freeExtraIds.includes(e.id))
    .reduce((s, e) => s + Number(e.promo_price ?? e.price), 0);

  const total = (basePrice != null ? Number(basePrice) : 0) + extrasTotal;
  const canConfirmStep1 = canOrder && (!hasVariants || selectedVariant !== null);

  // Suggestions : filtre les items déjà indispos ou vides.
  const drinks = useMemo(() => suggestedDrinks.filter((d) => d.is_available), [suggestedDrinks]);
  const desserts = useMemo(
    () => suggestedDesserts.filter((d) => d.is_available),
    [suggestedDesserts],
  );
  const hasDrinksStep = drinks.length > 0;
  const hasDessertsStep = desserts.length > 0;
  const wizard = hasDrinksStep || hasDessertsStep;

  // Calcul de la prochaine étape (saute les étapes vides).
  const nextStep = (from: 1 | 2 | 3): 1 | 2 | 3 | null => {
    if (from === 1 && hasDrinksStep) return 2;
    if ((from === 1 || from === 2) && hasDessertsStep) return 3;
    return null;
  };

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bumpSuggestion = (
    map: Map<string, number>,
    setMap: (m: Map<string, number>) => void,
    id: string,
    delta: number,
  ) => {
    const next = new Map(map);
    const cur = next.get(id) ?? 0;
    const q = Math.max(0, Math.min(10, cur + delta));
    if (q === 0) next.delete(id);
    else next.set(id, q);
    setMap(next);
  };

  const commit = () => {
    const price = hasVariants
      ? Number(selectedVariant!.price)
      : Number(item.promo_price ?? item.price);
    const note = itemNote.trim() ? itemNote.trim() : null;

    add(slug, {
      menu_item_id: item.id,
      variant_id: selectedVariant?.id ?? null,
      variant_name: selectedVariant?.name ?? null,
      name: item.name,
      price,
      note,
    });
    availableExtras.forEach((extra) => {
      if (!selectedExtras.has(extra.id)) return;
      const isFree = freeExtraIds.includes(extra.id);
      add(slug, {
        menu_item_id: extra.id,
        variant_id: null,
        variant_name: null,
        name: extra.name,
        price: isFree ? 0 : Number(extra.promo_price ?? extra.price),
        note: null,
      });
    });
    const addAllTimes = (list: MenuItem[], picks: Map<string, number>) => {
      list.forEach((it) => {
        const q = picks.get(it.id) ?? 0;
        for (let i = 0; i < q; i++) {
          add(slug, {
            menu_item_id: it.id,
            variant_id: null,
            variant_name: null,
            name: it.name,
            price: Number(it.promo_price ?? it.price),
            note: null,
          });
        }
      });
    };
    addAllTimes(drinks, selectedDrinks);
    addAllTimes(desserts, selectedDesserts);
    onClose();
  };

  const handlePrimary = () => {
    if (step === 1) {
      const next = nextStep(1);
      if (next) setStep(next);
      else commit();
      return;
    }
    if (step === 2) {
      const next = nextStep(2);
      if (next) setStep(next);
      else commit();
      return;
    }
    commit();
  };

  const primaryLabel = (() => {
    if (step === 1) {
      if (!wizard) return hasVariants && !selectedVariant ? 'Choisir une taille' : 'Ajouter au panier';
      return hasVariants && !selectedVariant ? 'Choisir une taille' : 'Suivant';
    }
    const next = nextStep(step);
    return next ? 'Suivant' : 'Ajouter tout au panier';
  })();
  const primaryDisabled = step === 1 && !canConfirmStep1;

  // Compte des étapes actives pour le stepper visuel.
  const activeSteps: (1 | 2 | 3)[] = [1];
  if (hasDrinksStep) activeSteps.push(2);
  if (hasDessertsStep) activeSteps.push(3);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl border-t border-[var(--site-border)] bg-[var(--site-surface)] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--site-bg)] text-[color:var(--site-muted)] hover:opacity-80"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Stepper visuel (wizard uniquement) */}
        {wizard && (
          <div className="sticky top-0 z-[1] border-b border-[var(--site-border)] bg-[var(--site-surface)] px-5 py-3">
            <div className="flex items-center gap-2">
              {activeSteps.map((s, idx) => (
                <div key={s} className="flex flex-1 items-center gap-2">
                  <div
                    className={
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition-colors ' +
                      (s < step
                        ? 'bg-[var(--site-accent)] text-[color:var(--site-accent-fg)]'
                        : s === step
                          ? 'bg-[var(--site-accent)] text-[color:var(--site-accent-fg)] ring-4 ring-[var(--site-accent)]/20'
                          : 'border border-[var(--site-border)] bg-[var(--site-bg)] text-[color:var(--site-muted)]')
                    }
                  >
                    {s < step ? <Check className="h-3 w-3" /> : activeSteps.indexOf(s) + 1}
                  </div>
                  <span
                    className={
                      'text-[11px] font-semibold whitespace-nowrap ' +
                      (s === step ? 'text-[color:var(--site-text)]' : 'text-[color:var(--site-muted)]')
                    }
                  >
                    {s === 1 ? 'Votre choix' : s === 2 ? 'Une boisson ?' : 'Un dessert ?'}
                  </span>
                  {idx < activeSteps.length - 1 && (
                    <span className="h-px flex-1 bg-[var(--site-border)]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ STEP 1 : Produit + options + note ═══════════ */}
        {step === 1 && (
          <>
        {/* Gallery */}
        {allImages.length > 0 && (
          <div className="relative h-52 w-full overflow-hidden bg-[var(--site-bg)]">
            <Image
              src={allImages[gallery]!}
              alt={item.name}
              fill
              className="object-cover"
              sizes="100vw"
            />
            {allImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGallery(i)}
                    className={
                      'h-1.5 rounded-full transition-all ' +
                      (i === gallery ? 'w-5 bg-white' : 'w-1.5 bg-white/50')
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          {/* Offer badge dans la modale */}
          {item.item_type === 'offer' && item.offer_badge && (
            <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white">
              🎁 {item.offer_badge}
            </span>
          )}

          <h2 className="font-[family-name:var(--font-site-heading)] text-xl font-extrabold text-[color:var(--site-text)]">{item.name}</h2>
          {item.item_type === 'offer' && item.offer_description ? (
            <p className="mt-1 text-sm leading-relaxed text-amber-700/80">
              {item.offer_description}
            </p>
          ) : item.description ? (
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--site-muted)]">{item.description}</p>
          ) : null}

          {/* Variantes */}
          {hasVariants && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
                Choisir une taille <span className="text-red-500">*</span>
              </p>
              <div className="mt-3 space-y-2">
                {availableVariants.map((v) => {
                  const selected = selectedVariant?.id === v.id;
                  return (
                    <label
                      key={v.id}
                      className={
                        'flex cursor-pointer items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all ' +
                        (selected
                          ? 'border-[var(--site-accent)] bg-[var(--site-accent)]/5'
                          : 'border-[var(--site-border)] hover:opacity-80')
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ' +
                            (selected ? 'border-[var(--site-accent)] bg-[var(--site-accent)]' : 'border-[var(--site-border)]')
                          }
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-[color:var(--site-accent-fg)]" />}
                        </span>
                        <span className="font-semibold text-[color:var(--site-text)]">{v.name}</span>
                      </div>
                      <span className="font-[family-name:var(--font-site-heading)] font-bold text-[color:var(--site-accent)] tabular-nums">
                        {formatPrice(v.price)}
                      </span>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={selected}
                        onChange={() => setSelectedVariant(v)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prix de base (sans variantes) */}
          {!hasVariants && (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-site-heading)] text-lg font-extrabold text-[color:var(--site-accent)] tabular-nums">
                {formatPrice(item.promo_price ?? item.price)}
              </span>
              {item.promo_price != null && (
                <span className="text-sm text-[color:var(--site-muted)] line-through">
                  {formatPrice(item.price)}
                </span>
              )}
            </div>
          )}

          {/* Suppléments / Sauces */}
          {availableExtras.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]">
                Sauces & suppléments
              </p>
              <ul className="mt-3 divide-y divide-[var(--site-border)]">
                {availableExtras.map((extra) => {
                  const checked = selectedExtras.has(extra.id);
                  const isFree = freeExtraIds.includes(extra.id);
                  const ePrice = extra.promo_price ?? extra.price;
                  const eDisabled = !extra.is_available || !canOrder;
                  return (
                    <li key={extra.id}>
                      <label
                        className={
                          'flex cursor-pointer items-center gap-3 py-3 ' +
                          (eDisabled ? 'cursor-not-allowed opacity-40' : '')
                        }
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--site-bg)]">
                          {extra.image_url ? (
                            <Image
                              src={extra.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg opacity-40">
                              {extra.item_type === 'sauce' ? '🥫' : '➕'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[color:var(--site-text)]">{extra.name}</p>
                          {extra.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-[color:var(--site-muted)]">
                              {extra.description}
                            </p>
                          )}
                          {isFree ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              ✓ Inclus gratuitement
                            </span>
                          ) : (
                            <p className="mt-0.5 text-xs font-bold text-[color:var(--site-accent)]">
                              +{formatPrice(ePrice)}
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={eDisabled}
                          onChange={() => toggleExtra(extra.id)}
                          className="h-5 w-5 shrink-0"
                          style={{ accentColor: 'var(--site-accent)' }}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Note pour le restaurant */}
          <div className="mt-5">
            <label
              htmlFor="item-note"
              className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--site-muted)]"
            >
              Une note pour le restaurant ? <span className="normal-case text-[color:var(--site-muted)]/70">(optionnel)</span>
            </label>
            <textarea
              id="item-note"
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Sans oignon, allergies, cuisson…"
              className="mt-2 w-full resize-none rounded-xl border border-[var(--site-border)] bg-[var(--site-bg)] p-3 text-sm text-[color:var(--site-text)] placeholder:text-[color:var(--site-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[color:var(--site-accent)]"
            />
            <p className="mt-1 text-right text-[10px] text-[color:var(--site-muted)] tabular-nums">
              {itemNote.length}/500
            </p>
          </div>
        </div>
          </>
        )}

        {/* ═══════════ STEP 2 : Suggestions boissons ═══════════ */}
        {step === 2 && (
          <div className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--site-accent)]">
              Une boisson pour aller avec ?
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-site-heading)] text-xl font-extrabold text-[color:var(--site-text)]">
              Complétez votre commande
            </h2>
            <SuggestionGrid
              items={drinks}
              picks={selectedDrinks}
              onBump={(id, d) => bumpSuggestion(selectedDrinks, setSelectedDrinks, id, d)}
              emoji="🥤"
            />
          </div>
        )}

        {/* ═══════════ STEP 3 : Suggestions desserts ═══════════ */}
        {step === 3 && (
          <div className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--site-accent)]">
              Un dessert pour finir en beauté ?
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-site-heading)] text-xl font-extrabold text-[color:var(--site-text)]">
              Envie de gourmandise ?
            </h2>
            <SuggestionGrid
              items={desserts}
              picks={selectedDesserts}
              onBump={(id, d) => bumpSuggestion(selectedDesserts, setSelectedDesserts, id, d)}
              emoji="🍰"
            />
          </div>
        )}
        </div>

        {/* ═══════════ Footer sticky : navigation + CTA ═══════════ */}
        <div className="shrink-0 border-t border-[var(--site-border)] bg-[var(--site-surface)] p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? (hasDrinksStep ? 2 : 1) : 1) as 1 | 2 | 3)}
                className="rounded-xl border border-[var(--site-border)] bg-[var(--site-bg)] px-4 py-3 text-sm font-semibold text-[color:var(--site-text)] transition-opacity hover:opacity-80"
              >
                Retour
              </button>
            )}
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrimary}
                className="rounded-xl bg-transparent px-2 text-sm font-semibold text-[color:var(--site-muted)] underline underline-offset-2 hover:text-[color:var(--site-text)]"
              >
                Passer
              </button>
            )}
            <button
              type="button"
              onClick={handlePrimary}
              disabled={primaryDisabled}
              className="ml-auto flex flex-1 items-center justify-between gap-2 rounded-2xl bg-[var(--site-accent)] px-5 py-3.5 text-[color:var(--site-accent-fg)] shadow-lg transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              <span className="flex items-center gap-2 font-bold">
                {step === 1 && !wizard ? <ShoppingBag className="h-4 w-4" /> : null}
                {primaryLabel}
                {(step === 1 && wizard) || (step > 1 && nextStep(step) !== null) ? (
                  <ArrowRight className="h-4 w-4" />
                ) : null}
              </span>
              {step === 1 && (selectedVariant || !hasVariants) && basePrice != null && (
                <span className="font-[family-name:var(--font-site-heading)] text-base font-black tabular-nums">
                  {formatPrice(total)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SuggestionGrid — grille compacte + stepper par item
═══════════════════════════════════════════════════════════ */
function SuggestionGrid({
  items,
  picks,
  onBump,
  emoji,
}: {
  items: MenuItem[];
  picks: Map<string, number>;
  onBump: (id: string, delta: number) => void;
  emoji: string;
}) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3">
      {items.map((it) => {
        const q = picks.get(it.id) ?? 0;
        return (
          <li
            key={it.id}
            className={
              'flex flex-col overflow-hidden rounded-2xl border transition-colors ' +
              (q > 0
                ? 'border-[var(--site-accent)] bg-[var(--site-accent)]/5'
                : 'border-[var(--site-border)] bg-[var(--site-bg)]')
            }
          >
            <div className="relative aspect-[4/3] bg-[var(--site-bg)]">
              {it.image_url ? (
                <Image
                  src={it.image_url}
                  alt={it.name}
                  fill
                  className="object-cover"
                  sizes="(min-width:640px) 25vw, 50vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl opacity-40">
                  {emoji}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <p className="line-clamp-2 text-sm font-bold text-[color:var(--site-text)]">
                {it.name}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="font-[family-name:var(--font-site-heading)] text-sm font-extrabold text-[color:var(--site-accent)] tabular-nums">
                  {formatPrice(it.promo_price ?? it.price)}
                </span>
                {q === 0 ? (
                  <button
                    type="button"
                    onClick={() => onBump(it.id, 1)}
                    aria-label={`Ajouter ${it.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--site-accent)] text-[color:var(--site-accent-fg)] transition-transform active:scale-90"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="flex h-8 items-center rounded-full bg-[var(--site-accent)] px-1">
                    <button
                      type="button"
                      onClick={() => onBump(it.id, -1)}
                      aria-label="Diminuer"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--site-accent-fg)] hover:bg-white/20"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[20px] text-center text-sm font-bold text-[color:var(--site-accent-fg)] tabular-nums">
                      {q}
                    </span>
                    <button
                      type="button"
                      onClick={() => onBump(it.id, 1)}
                      aria-label="Augmenter"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--site-accent-fg)] hover:bg-white/20"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
