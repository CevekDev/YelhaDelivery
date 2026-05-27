import { z } from 'zod';
import { algerianPhone } from './common';

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});

export const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, 'Nom trop court').max(120),
  customer_phone: algerianPhone,
  customer_address: z.string().trim().min(5, 'Adresse trop courte').max(500),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(orderItemSchema).min(1, 'Le panier est vide').max(50),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
