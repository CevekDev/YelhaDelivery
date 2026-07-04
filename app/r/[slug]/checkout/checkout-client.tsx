'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { placeOrderAction as _placeOrderAction, validatePromoAction } from './actions';
import { Banknote, Clock, MapPin, Minus, Plus, Tag, Trash2, X } from 'lucide-react';

interface Props {
  slug: string;
  restaurantName: string;
  deliveryFee: number;
  minOrder: number;
  canOrder: boolean;
  estimatedDeliveryTime: number;
  freeDeliveryAbove: number | null;
}

export function CheckoutClient({
  slug,
  restaurantName,
  deliveryFee: baseDeliveryFee,
  minOrder,
  canOrder,
  estimatedDeliveryTime,
  freeDeliveryAbove,
}: Props) {
  // Le slug est lié côté serveur (non falsifiable par le client)
  const placeOrderAction = _placeOrderAction.bind(null, slug);

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const lines = useCart((s) => s.lines);
  const cartSlug = useCart((s) => s.restaurantSlug);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Promo state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, startPromoTransition] = useTransition();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const relevant = cartSlug === slug ? lines : [];
  const subtotal = relevant.reduce((s, l) => s + l.price * l.quantity, 0);
  const isFreeDelivery = freeDeliveryAbove != null && subtotal >= freeDeliveryAbove;
  const deliveryFee = isFreeDelivery ? 0 : baseDeliveryFee;
  const discount = appliedPromo ? Math.min(appliedPromo.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;
  const empty = relevant.length === 0;
  const belowMin = subtotal < minOrder;
  const itemsCount = relevant.reduce((n, l) => n + l.quantity, 0);
  const remainingForFree =
    freeDeliveryAbove != null && !isFreeDelivery ? freeDeliveryAbove - subtotal : 0;

  const handleApplyPromo = () => {
    startPromoTransition(async () => {
      setPromoError(null);
      const res = await validatePromoAction(slug, promoInput, subtotal);
      if (!res.ok) {
        setPromoError(res.reason);
        setAppliedPromo(null);
      } else {
        setAppliedPromo({ code: promoInput.trim().toUpperCase(), discount: res.discount });
      }
    });
  };

  if (empty) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-[var(--site-radius)] border border-[var(--site-border)] bg-[var(--site-surface)] p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--site-bg)]">
            <Tag className="h-7 w-7 text-[color:var(--site-muted)]" />
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-site-heading)] text-xl font-bold text-[color:var(--site-text)]">Votre panier est vide</h1>
          <p className="mt-2 text-sm text-[color:var(--site-muted)]">
            Ajoutez quelques plats du menu pour passer commande.
          </p>
          <Link
            href={`/r/${slug}/menu`}
            className="mt-6 inline-flex items-center gap-2 rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 py-3 text-sm font-semibold text-[color:var(--site-accent-fg)] transition-transform hover:scale-105"
          >
            ← Retour au menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 lg:pb-10">
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:py-10">
          <h1 className="font-[family-name:var(--font-site-heading)] text-2xl font-extrabold text-[color:var(--site-text)] md:text-3xl">Finaliser ma commande</h1>
          <p className="mt-1 text-sm text-[color:var(--site-muted)]">
            {itemsCount} article{itemsCount > 1 ? 's' : ''} · livraison estimée ~{estimatedDeliveryTime} min · chez{' '}
            <strong className="text-[color:var(--site-text)]">{restaurantName}</strong>
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Colonne gauche : formulaire */}
            <div className="space-y-5">
              <section className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-6 ">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--site-accent)] text-xs font-bold text-[color:var(--site-accent-fg)]">
                    1
                  </span>
                  <h2 className="font-[family-name:var(--font-site-heading)] text-lg font-bold">Vos coordonnées</h2>
                </div>

                <form
                  id="checkout-form"
                  action={(fd) =>
                    startTransition(async () => {
                      setError(null);
                      setFieldErrors({});
                      if (appliedPromo) fd.set('promo_code', appliedPromo.code);
                      fd.set(
                        'items',
                        JSON.stringify(
                          relevant.map((l) => ({
                            menu_item_id: l.menu_item_id,
                            quantity: l.quantity,
                            ...(l.variant_id ? { variant_id: l.variant_id } : {}),
                            ...(l.note ? { note: l.note } : {}),
                          })),
                        ),
                      );
                      const res = await placeOrderAction(fd);
                      if (!res.ok) {
                        setError(res.error ?? null);
                        setFieldErrors(res.fieldErrors ?? {});
                      } else {
                        clear();
                        if (res.redirectTo) router.push(res.redirectTo);
                      }
                    })
                  }
                  className="mt-5 space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Nom complet *</Label>
                    <Input
                      id="customer_name"
                      name="customer_name"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      placeholder="Votre prénom et nom"
                      aria-invalid={!!fieldErrors.customer_name}
                      className="border-[var(--site-border)] bg-[var(--site-bg)] text-[color:var(--site-text)] placeholder:text-[color:var(--site-muted)]"
                    />
                    {fieldErrors.customer_name && (
                      <p className="text-xs text-destructive">{fieldErrors.customer_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Téléphone *</Label>
                    <Input
                      id="customer_phone"
                      name="customer_phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      pattern="0[5-7][0-9]{8}"
                      autoComplete="tel"
                      placeholder="0555 12 34 56"
                      aria-invalid={!!fieldErrors.customer_phone}
                      className="border-[var(--site-border)] bg-[var(--site-bg)] text-[color:var(--site-text)] placeholder:text-[color:var(--site-muted)]"
                    />
                    {fieldErrors.customer_phone && (
                      <p className="text-xs text-destructive">{fieldErrors.customer_phone}</p>
                    )}
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-6 ">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--site-accent)] text-xs font-bold text-[color:var(--site-accent-fg)]">
                    2
                  </span>
                  <h2 className="font-[family-name:var(--font-site-heading)] text-lg font-bold">Adresse de livraison</h2>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_address" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[color:var(--site-accent)]" />
                      Adresse complète *
                    </Label>
                    <Textarea
                      form="checkout-form"
                      id="customer_address"
                      name="customer_address"
                      required
                      minLength={5}
                      maxLength={500}
                      autoComplete="street-address"
                      placeholder="N°, rue, quartier, ville"
                      rows={2}
                      aria-invalid={!!fieldErrors.customer_address}
                      className="border-[var(--site-border)] bg-[var(--site-bg)] text-[color:var(--site-text)] placeholder:text-[color:var(--site-muted)]"
                    />
                    {fieldErrors.customer_address && (
                      <p className="text-xs text-destructive">{fieldErrors.customer_address}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Indications pour le livreur (optionnel)</Label>
                    <Textarea
                      form="checkout-form"
                      id="notes"
                      name="notes"
                      maxLength={500}
                      rows={2}
                      placeholder="Code interphone, étage, instructions particulières…"
                      className="border-[var(--site-border)] bg-[var(--site-bg)] text-[color:var(--site-text)] placeholder:text-[color:var(--site-muted)]"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] p-6 ">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--site-accent)] text-xs font-bold text-[color:var(--site-accent-fg)]">
                    3
                  </span>
                  <h2 className="font-[family-name:var(--font-site-heading)] text-lg font-bold">Paiement</h2>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-xl border-2 border-[var(--site-accent)] bg-[var(--site-accent)]/5 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent)]/15 text-[color:var(--site-accent)]">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Espèces à la livraison</p>
                    <p className="text-xs text-[color:var(--site-muted)]">
                      Vous payez <strong>{formatPrice(total)}</strong> au livreur à la réception
                      {isFreeDelivery && ' (livraison offerte)'}.
                    </p>
                  </div>
                </div>
              </section>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
            </div>

            {/* Colonne droite : récap sticky */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl border border-[var(--site-border)] bg-[var(--site-surface)] ">
                <div className="border-b border-[var(--site-border)] p-5">
                  <h2 className="font-[family-name:var(--font-site-heading)] text-lg font-bold">Votre commande</h2>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[color:var(--site-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{estimatedDeliveryTime} min
                    </span>
                    <span>·</span>
                    <span>{itemsCount} article{itemsCount > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <ul className="max-h-80 divide-y divide-[var(--site-border)] overflow-y-auto px-5">
                  {relevant.map((l) => (
                    <li key={l.cart_key} className="flex items-start gap-3 py-3">
                      <div className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--site-border)] bg-[var(--site-bg)] p-1">
                        <button
                          type="button"
                          onClick={() => setQty(l.cart_key, l.quantity - 1)}
                          aria-label="Diminuer"
                          className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--site-muted)] hover:bg-[var(--site-bg)] hover:text-[color:var(--site-text)]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-semibold tabular-nums">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(l.cart_key, l.quantity + 1)}
                          aria-label="Augmenter"
                          className="flex h-6 w-6 items-center justify-center rounded text-[color:var(--site-accent)] hover:bg-[var(--site-accent)] hover:text-[color:var(--site-accent-fg)]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">{l.name}</p>
                        {l.variant_name && (
                          <p className="text-xs text-[color:var(--site-accent)] font-medium">{l.variant_name}</p>
                        )}
                        {l.note && (
                          <p className="mt-0.5 line-clamp-2 italic text-[11px] text-[color:var(--site-muted)]">
                            « {l.note} »
                          </p>
                        )}
                        <p className="text-xs text-[color:var(--site-muted)]">{formatPrice(l.price)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatPrice(l.price * l.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(l.cart_key)}
                          aria-label="Retirer"
                          className="text-[color:var(--site-muted)] hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 border-t border-[var(--site-border)] p-5 text-sm">
                  {/* Promo input */}
                  {!appliedPromo ? (
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--site-muted)]">
                        <Tag className="h-3.5 w-3.5" /> Code promo
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value);
                            setPromoError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyPromo();
                            }
                          }}
                          placeholder="EX: BIENVENUE20"
                          className="h-9 flex-1 rounded-md border border-[var(--site-border)] bg-[var(--site-bg)] px-2 font-mono text-xs uppercase"
                          style={{ textTransform: 'uppercase' }}
                          maxLength={30}
                        />
                        <button
                          type="button"
                          disabled={promoPending || !promoInput.trim()}
                          onClick={handleApplyPromo}
                          className="h-9 rounded-md border border-[var(--site-border)] bg-[var(--site-bg)] px-3 text-xs font-semibold text-[color:var(--site-text)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {promoPending ? '…' : 'Appliquer'}
                        </button>
                      </div>
                      {promoError && <p className="text-xs text-destructive">{promoError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 text-success">
                        <Tag className="h-3.5 w-3.5" />
                        Code <code className="font-mono font-bold">{appliedPromo.code}</code>{' '}
                        appliqué
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromo(null);
                          setPromoInput('');
                          setPromoError(null);
                        }}
                        aria-label="Retirer le code"
                        className="text-success hover:text-[color:var(--site-text)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {remainingForFree > 0 && (
                    <div className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                      🎁 Encore <strong>{formatPrice(remainingForFree)}</strong> et la livraison
                      vous est offerte !
                    </div>
                  )}

                  <div className="space-y-1.5 border-t border-[var(--site-border)] pt-3">
                    <div className="flex justify-between text-[color:var(--site-muted)]">
                      <span>Sous-total</span>
                      <span className="tabular-nums">{formatPrice(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Réduction ({appliedPromo!.code})</span>
                        <span className="tabular-nums">−{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[color:var(--site-muted)]">
                      <span>Frais de livraison</span>
                      {isFreeDelivery ? (
                        <span className="font-semibold text-success">
                          <span className="line-through opacity-50">
                            {formatPrice(baseDeliveryFee)}
                          </span>{' '}
                          Offerte
                        </span>
                      ) : (
                        <span className="tabular-nums">{formatPrice(deliveryFee)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-[var(--site-border)] pt-3 font-[family-name:var(--font-site-heading)] text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatPrice(total)}</span>
                  </div>
                  {belowMin && (
                    <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                      Encore {formatPrice(minOrder - subtotal)} pour atteindre le minimum de{' '}
                      {formatPrice(minOrder)}.
                    </p>
                  )}
                </div>

                {/* CTA desktop */}
                <div className="hidden border-t border-[var(--site-border)] p-5 lg:block">
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={isPending || belowMin || !canOrder}
                    className="flex h-12 w-full items-center justify-center rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 text-sm font-bold text-[color:var(--site-accent-fg)] transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? 'Envoi…' : `Confirmer la commande · ${formatPrice(total)}`}
                  </button>
                  <p className="mt-3 text-center text-[11px] text-[color:var(--site-muted)]">
                    En confirmant, vous acceptez nos{' '}
                    <Link href="/cgu" className="underline">
                      conditions
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </aside>
          </div>
      </main>

      {/* Sticky CTA mobile uniquement */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--site-border)] bg-[var(--site-bg)] p-4 shadow-[0_-4px_12px_-2px_rgb(0_0_0/0.05)] lg:hidden">
        <button
          type="submit"
          form="checkout-form"
          disabled={isPending || belowMin || !canOrder}
          className="flex h-12 w-full items-center justify-center rounded-[var(--site-radius)] bg-[var(--site-accent)] px-5 text-sm font-bold text-[color:var(--site-accent-fg)] transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Envoi…' : `Commander · ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
