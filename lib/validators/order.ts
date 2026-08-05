import { z } from 'zod';
import { addressSchema, algerianPhone, personNameSchema } from './common';

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  variant_id: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
});

export const checkoutSchema = z.object({
  customer_name: personNameSchema,
  customer_phone: algerianPhone,
  customer_address: addressSchema,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(orderItemSchema).min(1, 'Le panier est vide').max(50),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
