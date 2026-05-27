import type { OrderStatus } from '@/types/database';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  assigned: 'Assignée',
  on_the_way: 'En route',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const ORDER_STATUS_VARIANT: Record<
  OrderStatus,
  'warning' | 'info' | 'default' | 'purple' | 'cyan' | 'success' | 'destructive'
> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'default',
  assigned: 'purple',
  on_the_way: 'cyan',
  delivered: 'success',
  cancelled: 'destructive',
};

/**
 * Transitions de statut autorisées par rôle.
 * Vérifié côté serveur dans chaque Server Action de mise à jour.
 */
export const RESTAURATEUR_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['assigned', 'cancelled'],
  assigned: ['preparing', 'cancelled'], // ré-attribution possible
};

export const LIVREUR_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  assigned: ['on_the_way'],
  on_the_way: ['delivered'],
};

export function canRestaurateurTransition(from: OrderStatus, to: OrderStatus): boolean {
  return RESTAURATEUR_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canLivreurTransition(from: OrderStatus, to: OrderStatus): boolean {
  return LIVREUR_TRANSITIONS[from]?.includes(to) ?? false;
}
