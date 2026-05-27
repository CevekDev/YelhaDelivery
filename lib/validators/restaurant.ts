import { z } from 'zod';
import { algerianPhone, priceSchema, slugSchema } from './common';

export const restaurantUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: z.string().trim().max(500).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  phone: algerianPhone.optional().or(z.literal('')),
  delivery_fee: priceSchema,
  min_order: priceSchema,
  estimated_delivery_time: z.number().int().min(5).max(240),
  is_open: z.boolean(),
  accept_orders: z.boolean(),
});
export type RestaurantUpdateInput = z.infer<typeof restaurantUpdateSchema>;
