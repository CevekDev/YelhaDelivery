import { describe, it, expect } from 'vitest';
import {
  canLivreurTransition,
  canRestaurateurTransition,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANT,
} from '@/lib/order-status';

describe('canRestaurateurTransition', () => {
  it('allows pending -> confirmed and pending -> cancelled', () => {
    expect(canRestaurateurTransition('pending', 'confirmed')).toBe(true);
    expect(canRestaurateurTransition('pending', 'cancelled')).toBe(true);
  });
  it('forbids skipping states', () => {
    expect(canRestaurateurTransition('pending', 'on_the_way')).toBe(false);
    expect(canRestaurateurTransition('pending', 'delivered')).toBe(false);
  });
  it('forbids transitions from terminal states', () => {
    expect(canRestaurateurTransition('delivered', 'pending')).toBe(false);
    expect(canRestaurateurTransition('cancelled', 'pending')).toBe(false);
  });
  it('forbids restaurateur marking delivered (livreur’s job)', () => {
    expect(canRestaurateurTransition('on_the_way', 'delivered')).toBe(false);
  });
});

describe('canLivreurTransition', () => {
  it('allows assigned -> on_the_way and on_the_way -> delivered', () => {
    expect(canLivreurTransition('assigned', 'on_the_way')).toBe(true);
    expect(canLivreurTransition('on_the_way', 'delivered')).toBe(true);
  });
  it('forbids skipping states', () => {
    expect(canLivreurTransition('assigned', 'delivered')).toBe(false);
  });
  it('forbids reverse transitions', () => {
    expect(canLivreurTransition('delivered', 'on_the_way')).toBe(false);
    expect(canLivreurTransition('on_the_way', 'assigned')).toBe(false);
  });
  it('forbids livreur from cancelling', () => {
    expect(canLivreurTransition('assigned', 'cancelled' as never)).toBe(false);
  });
});

describe('status maps', () => {
  it('has a label and variant for every status', () => {
    const statuses = [
      'pending',
      'confirmed',
      'preparing',
      'assigned',
      'on_the_way',
      'delivered',
      'cancelled',
    ] as const;
    for (const s of statuses) {
      expect(ORDER_STATUS_LABELS[s]).toBeTruthy();
      expect(ORDER_STATUS_VARIANT[s]).toBeTruthy();
    }
  });
});
