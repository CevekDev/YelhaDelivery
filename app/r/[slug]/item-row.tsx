'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';
import type { MenuItem, MenuItemVariant } from '@/types/database';

/* ═══════════════════════════════════════════════════════════
   ItemRow — ligne UberEats-style
   Ouvre un modal si des variantes ou des extras sont définis
═══════════════════════════════════════════════════════════ */
export function ItemRow({
  item,
  slug,
  canOrder,
  availableExtras,
  availableVariants,
  extra: isExtraItem,
}: {
  item: MenuItem;
  slug: string;
  canOrder: boolean;
  availableExtras: MenuItem[];
  availableVariants: MenuItemVariant[];
  extra?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);

  // All cart lines for this menu_item_id (across all variants)
  const lines = useCart((s) => s.lines.filter((l) => l.menu_item_id === item.id));
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
          'flex items-start gap-4 px-5 py-4 transition-colors hover:bg-gray-50 ' +
          (disabled ? 'opacity-50' : '')
        }
      >
        {/* Texte */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 leading-snug">{item.name}</p>
            {discount > 0 && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                -{discount}%
              </span>
            )}
            {!item.is_available && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                Indisponible
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-gray-500">{item.description}</p>
          )}
          {hasVariants && (
            <p className="mt-1 text-xs text-primary font-medium">
              {availableVariants.length} taille{availableVariants.length > 1 ? 's' : ''} disponible{availableVariants.length > 1 ? 's' : ''}
            </p>
          )}
          {!hasVariants && hasExtras && (
            <p className="mt-1 text-xs text-primary font-medium">
              Personnalisable · {availableExtras.length} option{availableExtras.length > 1 ? 's' : ''}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-base font-extrabold text-gray-900 tabular-nums">
              {isExtraItem ? '+' : ''}{formatPrice(activePrice)}
            </span>
            {item.promo_price != null && (
              <span className="text-sm text-gray-400 line-through tabular-nums">
                {formatPrice(item.price)}
              </span>
            )}
          </div>
        </div>

        {/* Image + bouton */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100 md:h-24 md:w-24">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">
                🍽️
              </div>
            )}
            {item.image_urls.length > 0 && (
              <div className="absolute bottom-1 right-1 flex gap-0.5">
                {item.image_urls.slice(0, 3).map((_, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80 shadow" />
                ))}
              </div>
            )}
          </div>

          {/* Bouton add / qty */}
          {totalQty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={disabled}
              aria-label={`Ajouter ${item.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-gray-900 shadow-sm transition-all hover:bg-gray-900 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : hasVariants ? (
            /* Items with variants: show total qty badge + open modal again */
            <div className="flex items-center gap-1.5 rounded-full border-2 border-gray-900 bg-white p-0.5">
              <span className="min-w-[44px] text-center text-sm font-bold tabular-nums text-gray-900 px-1">
                {totalQty} ajouté{totalQty > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                aria-label="Ajouter une autre variante"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* Simple item (no variants): inline stepper */
            <div className="flex items-center gap-1.5 rounded-full border-2 border-gray-900 bg-white p-0.5">
              <button
                type="button"
                onClick={() => singleLine && setQty(singleLine.cart_key, singleLine.quantity - 1)}
                aria-label="Diminuer"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[20px] text-center text-sm font-bold tabular-nums text-gray-900">
                {totalQty}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (hasExtras) {
                    setShowModal(true);
                  } else if (singleLine) {
                    setQty(singleLine.cart_key, singleLine.quantity + 1);
                  }
                }}
                aria-label="Augmenter"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal extras + variantes */}
      {showModal && (
        <ItemModal
          item={item}
          availableExtras={availableExtras}
          availableVariants={availableVariants}
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
  slug,
  canOrder,
  onClose,
}: {
  item: MenuItem;
  availableExtras: MenuItem[];
  availableVariants: MenuItemVariant[];
  slug: string;
  canOrder: boolean;
  onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [gallery, setGallery] = useState(0);

  const hasVariants = availableVariants.length > 0;
  const allImages = [item.image_url, ...item.image_urls].filter(Boolean) as string[];
  const basePrice = hasVariants
    ? (selectedVariant?.price ?? null)
    : (item.promo_price ?? item.price);

  const extrasTotal = availableExtras
    .filter((e) => selectedExtras.has(e.id))
    .reduce((s, e) => s + Number(e.promo_price ?? e.price), 0);

  const total = (basePrice != null ? Number(basePrice) : 0) + extrasTotal;
  const canConfirm = canOrder && (!hasVariants || selectedVariant !== null);

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const price = hasVariants ? Number(selectedVariant!.price) : Number(item.promo_price ?? item.price);
    add(slug, {
      menu_item_id: item.id,
      variant_id: selectedVariant?.id ?? null,
      variant_name: selectedVariant?.name ?? null,
      name: item.name,
      price,
    });
    availableExtras.forEach((extra) => {
      if (!selectedExtras.has(extra.id)) return;
      add(slug, {
        menu_item_id: extra.id,
        variant_id: null,
        variant_name: null,
        name: extra.name,
        price: Number(extra.promo_price ?? extra.price),
      });
    });
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Galerie */}
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
                      'h-2 rounded-full transition-all ' +
                      (i === gallery ? 'w-5 bg-white' : 'w-2 bg-white/50')
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          <h2 className="font-display text-xl font-extrabold text-gray-900">{item.name}</h2>
          {item.description && (
            <p className="mt-1 text-sm text-gray-500">{item.description}</p>
          )}

          {/* === Variantes === */}
          {hasVariants && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Choisir une taille <span className="text-destructive">*</span>
              </p>
              <div className="mt-3 space-y-2">
                {availableVariants.map((v) => {
                  const selected = selectedVariant?.id === v.id;
                  return (
                    <label
                      key={v.id}
                      className={
                        'flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ' +
                        (selected
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-400')
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ' +
                            (selected ? 'border-gray-900 bg-gray-900' : 'border-gray-300')
                          }
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>
                        <span className="font-semibold text-gray-900">{v.name}</span>
                      </div>
                      <span className="font-display font-bold text-gray-900 tabular-nums">
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

          {/* Prix de base (quand pas de variantes) */}
          {!hasVariants && (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-lg font-bold text-gray-900 tabular-nums">
                {formatPrice(item.promo_price ?? item.price)}
              </span>
              {item.promo_price != null && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(item.price)}</span>
              )}
            </div>
          )}

          {/* === Suppléments === */}
          {availableExtras.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Ajouter des suppléments
              </p>
              <ul className="mt-3 divide-y divide-gray-100">
                {availableExtras.map((extra) => {
                  const checked = selectedExtras.has(extra.id);
                  const ePrice = extra.promo_price ?? extra.price;
                  const eDisabled = !extra.is_available || !canOrder;
                  return (
                    <li key={extra.id}>
                      <label
                        className={
                          'flex cursor-pointer items-center gap-4 py-3 ' +
                          (eDisabled ? 'opacity-40 cursor-not-allowed' : '')
                        }
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {extra.image_url ? (
                            <Image src={extra.image_url} alt="" fill className="object-cover" sizes="56px" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl opacity-40">🥫</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">{extra.name}</p>
                          {extra.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{extra.description}</p>
                          )}
                          <p className="mt-0.5 text-xs font-bold text-primary">+{formatPrice(ePrice)}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={eDisabled}
                          onChange={() => toggleExtra(extra.id)}
                          className="h-5 w-5 shrink-0 accent-gray-900"
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
            className="mt-6 flex w-full items-center justify-between rounded-xl bg-gray-900 px-5 py-4 text-white transition-all hover:bg-gray-800 active:scale-[0.99] disabled:opacity-50"
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="h-4 w-4" />
              {hasVariants && !selectedVariant ? 'Choisir une taille' : 'Ajouter au panier'}
            </span>
            {(selectedVariant || !hasVariants) && basePrice != null && (
              <span className="font-display text-base font-bold tabular-nums">
                {formatPrice(total)}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
