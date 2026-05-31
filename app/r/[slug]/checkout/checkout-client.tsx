'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { placeOrderAction } from './actions';
import { ArrowLeft, Banknote, Clock, MapPin, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

interface Props {
  slug: string;
  restaurantName: string;
  deliveryFee: number;
  minOrder: number;
  canOrder: boolean;
  estimatedDeliveryTime: number;
}

export function CheckoutClient({
  slug,
  restaurantName,
  deliveryFee,
  minOrder,
  canOrder,
  estimatedDeliveryTime,
}: Props) {
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

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const relevant = cartSlug === slug ? lines : [];
  const subtotal = relevant.reduce((s, l) => s + l.price * l.quantity, 0);
  const total = subtotal + deliveryFee;
  const empty = relevant.length === 0;
  const belowMin = subtotal < minOrder;
  const itemsCount = relevant.reduce((n, l) => n + l.quantity, 0);

  if (empty) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-5 font-display text-xl font-bold">Votre panier est vide</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajoutez quelques plats du menu pour passer commande.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/r/${slug}`}>← Retour au menu</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32 lg:pb-10">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-3">
          <Link
            href={`/r/${slug}`}
            className="-ml-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="hidden text-muted-foreground sm:inline">Commande chez</span>
            <strong className="font-display">{restaurantName}</strong>
          </div>
        </div>
      </header>

      <main className="container py-6 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-2xl font-extrabold md:text-3xl">Finaliser ma commande</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {itemsCount} article{itemsCount > 1 ? 's' : ''} · livraison estimée ~{estimatedDeliveryTime} min
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Colonne gauche : formulaire */}
            <div className="space-y-5">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  <h2 className="font-display text-lg font-bold">Vos coordonnées</h2>
                </div>

                <form
                  id="checkout-form"
                  action={(fd) =>
                    startTransition(async () => {
                      setError(null);
                      setFieldErrors({});
                      fd.set('slug', slug);
                      fd.set(
                        'items',
                        JSON.stringify(
                          relevant.map((l) => ({
                            menu_item_id: l.menu_item_id,
                            quantity: l.quantity,
                          })),
                        ),
                      );
                      const res = await placeOrderAction(fd);
                      if (!res.ok) {
                        setError(res.error ?? null);
                        setFieldErrors(res.fieldErrors ?? {});
                      } else {
                        clear();
                        router.refresh();
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
                    />
                    {fieldErrors.customer_phone && (
                      <p className="text-xs text-destructive">{fieldErrors.customer_phone}</p>
                    )}
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </span>
                  <h2 className="font-display text-lg font-bold">Adresse de livraison</h2>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_address" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
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
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </span>
                  <h2 className="font-display text-lg font-bold">Paiement</h2>
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Espèces à la livraison</p>
                    <p className="text-xs text-muted-foreground">
                      Vous payez {formatPrice(total)} au livreur à la réception.
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
              <div className="rounded-2xl border border-border bg-card shadow-card">
                <div className="border-b border-border p-5">
                  <h2 className="font-display text-lg font-bold">Votre commande</h2>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{estimatedDeliveryTime} min
                    </span>
                    <span>·</span>
                    <span>{itemsCount} article{itemsCount > 1 ? 's' : ''}</span>
                  </div>
                </div>

                <ul className="max-h-80 divide-y divide-border overflow-y-auto px-5">
                  {relevant.map((l) => (
                    <li key={l.menu_item_id} className="flex items-start gap-3 py-3">
                      <div className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted p-1">
                        <button
                          type="button"
                          onClick={() => setQty(l.menu_item_id, l.quantity - 1)}
                          aria-label="Diminuer"
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-semibold tabular-nums">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(l.menu_item_id, l.quantity + 1)}
                          aria-label="Augmenter"
                          className="flex h-6 w-6 items-center justify-center rounded text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(l.price)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatPrice(l.price * l.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(l.menu_item_id)}
                          aria-label="Retirer"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 border-t border-border p-5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sous-total</span>
                    <span className="tabular-nums">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frais de livraison</span>
                    <span className="tabular-nums">{formatPrice(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 font-display text-base font-bold">
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
                <div className="hidden border-t border-border p-5 lg:block">
                  <Button
                    type="submit"
                    form="checkout-form"
                    size="lg"
                    className="w-full"
                    disabled={isPending || belowMin || !canOrder}
                  >
                    {isPending ? 'Envoi…' : `Confirmer la commande · ${formatPrice(total)}`}
                  </Button>
                  <p className="mt-3 text-center text-[11px] text-muted-foreground">
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
        </div>
      </main>

      {/* Sticky CTA mobile uniquement */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-4 shadow-[0_-4px_12px_-2px_rgb(0_0_0/0.05)] lg:hidden">
        <Button
          type="submit"
          form="checkout-form"
          size="lg"
          className="w-full"
          disabled={isPending || belowMin || !canOrder}
        >
          {isPending ? 'Envoi…' : `Commander · ${formatPrice(total)}`}
        </Button>
      </div>
    </div>
  );
}
