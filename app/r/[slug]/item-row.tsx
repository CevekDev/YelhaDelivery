'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, X, ShoppingBag } from 'lucide-react';
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
}: {
  item: MenuItem;
  slug: string;
  canOrder: boolean;
  availableExtras: MenuItem[];
  availableVariants: MenuItemVariant[];
  freeExtraIds?: string[];
  extra?: boolean;
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
  const needsModal = hasExtras || hasVariants;

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
      });
    }
  };

  return (
    <>
      <div
        className={
          'mx-4 flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm transition-opacity ' +
          (disabled ? 'opacity-60' : '') +
          (isOffer ? ' border border-amber-200/60 bg-amber-50/40' : '')
        }
      >
        {/* ── Left: text + price ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Offer badge */}
          {isOffer && item.offer_badge && (
            <span className="mb-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
              🎁 {item.offer_badge}
            </span>
          )}

          {/* Nom + badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-bold leading-snug text-[#1A1A1A]">{item.name}</p>
            {discount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                -{discount}%
              </span>
            )}
            {!item.is_available && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
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
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
              {item.description}
            </p>
          ) : null}

          {/* Variant / extras hint */}
          {hasVariants && (
            <p className="mt-1 text-[11px] font-semibold text-primary">
              {availableVariants.length} taille{availableVariants.length > 1 ? 's' : ''} disponible
              {availableVariants.length > 1 ? 's' : ''}
            </p>
          )}
          {!hasVariants && hasExtras && (
            <p className="mt-1 text-[11px] font-semibold text-primary">
              {availableExtras.length} option{availableExtras.length > 1 ? 's' : ''} disponible
              {availableExtras.length > 1 ? 's' : ''}
            </p>
          )}

          {/* Price */}
          <div className="mt-auto flex items-baseline gap-1.5 pt-3">
            <span className="font-display text-[15px] font-extrabold text-primary tabular-nums">
              {isExtraItem ? '+' : ''}
              {formatPrice(activePrice)}
            </span>
            {item.promo_price != null && (
              <span className="text-xs text-gray-400 line-through tabular-nums">
                {formatPrice(item.price)}
              </span>
            )}
          </div>
        </div>

        {/* ── Right: image + controls ── */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Image */}
          <div className="relative h-[84px] w-[84px] overflow-hidden rounded-xl bg-gray-100">
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
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform active:scale-90 disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : hasVariants ? (
            /* Multi-variant: badge + open modal */
            <div className="flex h-8 items-center gap-1 rounded-full bg-primary px-2.5 shadow-md">
              <span className="min-w-[18px] text-center text-xs font-bold text-white tabular-nums">
                {totalQty}×
              </span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                aria-label="Ajouter une variante"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
              >
                <Plus className="h-3 w-3 text-white" />
              </button>
            </div>
          ) : (
            /* Simple item: inline stepper */
            <div className="flex h-8 items-center rounded-full bg-primary px-1 shadow-md">
              <button
                type="button"
                onClick={() => singleLine && setQty(singleLine.cart_key, singleLine.quantity - 1)}
                aria-label="Diminuer"
                className="flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[20px] text-center text-sm font-bold text-white tabular-nums">
                {totalQty}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (hasExtras) setShowModal(true);
                  else if (singleLine) setQty(singleLine.cart_key, singleLine.quantity + 1);
                }}
                aria-label="Augmenter"
                className="flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal variantes + suppléments */}
      {showModal && (
        <ItemModal
          item={item}
          availableExtras={availableExtras}
          availableVariants={availableVariants}
          freeExtraIds={freeExtraIds}
          slug={slug}
          canOrder={canOrder}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ItemModal — bottom sheet variantes + suppléments
═══════════════════════════════════════════════════════════ */
function ItemModal({
  item,
  availableExtras,
  availableVariants,
  freeExtraIds,
  slug,
  canOrder,
  onClose,
}: {
  item: MenuItem;
  availableExtras: MenuItem[];
  availableVariants: MenuItemVariant[];
  freeExtraIds: string[];
  slug: string;
  canOrder: boolean;
  onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  // Pré-sélectionner les extras gratuits
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(
    new Set(freeExtraIds),
  );
  const [gallery, setGallery] = useState(0);

  const hasVariants = availableVariants.length > 0;
  const allImages = [item.image_url, ...(item.image_urls ?? [])].filter(Boolean) as string[];
  const basePrice = hasVariants
    ? (selectedVariant?.price ?? null)
    : (item.promo_price ?? item.price);

  // Les extras gratuits ne s'ajoutent pas au total
  const extrasTotal = availableExtras
    .filter((e) => selectedExtras.has(e.id) && !freeExtraIds.includes(e.id))
    .reduce((s, e) => s + Number(e.promo_price ?? e.price), 0);

  const total = (basePrice != null ? Number(basePrice) : 0) + extrasTotal;
  const canConfirm = canOrder && (!hasVariants || selectedVariant !== null);

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleConfirm = () => {
    const price = hasVariants
      ? Number(selectedVariant!.price)
      : Number(item.promo_price ?? item.price);
    add(slug, {
      menu_item_id: item.id,
      variant_id: selectedVariant?.id ?? null,
      variant_name: selectedVariant?.name ?? null,
      name: item.name,
      price,
    });
    availableExtras.forEach((extra) => {
      if (!selectedExtras.has(extra.id)) return;
      const isFree = freeExtraIds.includes(extra.id);
      add(slug, {
        menu_item_id: extra.id,
        variant_id: null,
        variant_name: null,
        name: extra.name,
        // Prix 0 si gratuit, sinon prix normal
        price: isFree ? 0 : Number(extra.promo_price ?? extra.price),
      });
    });
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F5] text-gray-500 hover:bg-gray-200"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gallery */}
        {allImages.length > 0 && (
          <div className="relative h-52 w-full overflow-hidden bg-gray-100">
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

          <h2 className="font-display text-xl font-extrabold text-[#1A1A1A]">{item.name}</h2>
          {item.item_type === 'offer' && item.offer_description ? (
            <p className="mt-1 text-sm leading-relaxed text-amber-700/80">
              {item.offer_description}
            </p>
          ) : item.description ? (
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{item.description}</p>
          ) : null}

          {/* Variantes */}
          {hasVariants && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
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
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300')
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ' +
                            (selected ? 'border-primary bg-primary' : 'border-gray-300')
                          }
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>
                        <span className="font-semibold text-[#1A1A1A]">{v.name}</span>
                      </div>
                      <span className="font-display font-bold text-primary tabular-nums">
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
              <span className="font-display text-lg font-extrabold text-primary tabular-nums">
                {formatPrice(item.promo_price ?? item.price)}
              </span>
              {item.promo_price != null && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(item.price)}
                </span>
              )}
            </div>
          )}

          {/* Suppléments / Sauces */}
          {availableExtras.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Sauces & suppléments
              </p>
              <ul className="mt-3 divide-y divide-gray-100">
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
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100">
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
                          <p className="text-sm font-semibold text-[#1A1A1A]">{extra.name}</p>
                          {extra.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">
                              {extra.description}
                            </p>
                          )}
                          {isFree ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              ✓ Inclus gratuitement
                            </span>
                          ) : (
                            <p className="mt-0.5 text-xs font-bold text-primary">
                              +{formatPrice(ePrice)}
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={eDisabled}
                          onChange={() => toggleExtra(extra.id)}
                          className="h-5 w-5 shrink-0 accent-primary"
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="mt-6 flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-white shadow-[0_4px_20px_rgb(255,92,26,0.30)] transition-all hover:bg-primary-dark active:scale-[0.99] disabled:opacity-50"
          >
            <span className="flex items-center gap-2 font-bold">
              <ShoppingBag className="h-4 w-4" />
              {hasVariants && !selectedVariant ? 'Choisir une taille' : 'Ajouter au panier'}
            </span>
            {(selectedVariant || !hasVariants) && basePrice != null && (
              <span className="font-display text-base font-black tabular-nums">
                {formatPrice(total)}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
