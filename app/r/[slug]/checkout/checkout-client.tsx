'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/stores/cart';
import { placeOrderAction } from './actions';

interface Props {
  slug: string;
  restaurantName: string;
  deliveryFee: number;
  minOrder: number;
  canOrder: boolean;
}

export function CheckoutClient({ slug, restaurantName, deliveryFee, minOrder, canOrder }: Props) {
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

  if (empty) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <p className="text-muted-foreground">Votre panier est vide.</p>
          <Button asChild>
            <Link href={`/r/${slug}`}>Voir le menu</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/r/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au menu
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Valider ma commande</h1>
        <p className="text-sm text-muted-foreground">Chez {restaurantName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Votre panier</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {relevant.map((l) => (
              <li key={l.menu_item_id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(l.price)} l’unité</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty(l.menu_item_id, l.quantity - 1)}
                    className="h-8 w-8 rounded-md border border-border"
                    aria-label="Diminuer"
                  >
                    −
                  </button>
                  <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQty(l.menu_item_id, l.quantity + 1)}
                    className="h-8 w-8 rounded-md bg-primary text-primary-foreground"
                    aria-label="Augmenter"
                  >
                    +
                  </button>
                </div>
                <p className="w-20 text-right font-semibold tabular-nums">
                  {formatPrice(l.price * l.quantity)}
                </p>
                <button
                  type="button"
                  onClick={() => remove(l.menu_item_id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Livraison</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            {belowMin && (
              <p className="mt-2 text-xs text-warning">
                Montant minimum : {formatPrice(minOrder)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vos informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) =>
              startTransition(async () => {
                setError(null);
                setFieldErrors({});
                fd.set('slug', slug);
                fd.set(
                  'items',
                  JSON.stringify(
                    relevant.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity })),
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
            className="space-y-4"
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
                placeholder="0555123456"
                aria-invalid={!!fieldErrors.customer_phone}
              />
              {fieldErrors.customer_phone && (
                <p className="text-xs text-destructive">{fieldErrors.customer_phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_address">Adresse de livraison *</Label>
              <Textarea
                id="customer_address"
                name="customer_address"
                required
                minLength={5}
                maxLength={500}
                autoComplete="street-address"
                aria-invalid={!!fieldErrors.customer_address}
              />
              {fieldErrors.customer_address && (
                <p className="text-xs text-destructive">{fieldErrors.customer_address}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Note (optionnel)</Label>
              <Textarea id="notes" name="notes" maxLength={500} placeholder="Ex: code interphone, étage…" />
            </div>

            <div className="rounded-md border border-border bg-input px-3 py-2 text-sm">
              💵 Paiement <strong>cash à la livraison</strong>
            </div>

            {error && (
              <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending || belowMin || !canOrder}>
              {isPending ? 'Envoi…' : `Commander · ${formatPrice(total)}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
