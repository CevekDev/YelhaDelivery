import { z } from 'zod';
import { algerianPhone, LETTER_RE, priceSchema, slugSchema } from './common';

export const restaurantUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(LETTER_RE, 'Le nom du restaurant doit contenir des lettres'),
    slug: slugSchema,
    description: z.string().trim().max(500).optional().or(z.literal('')),
    address: z
      .string()
      .trim()
      .max(300)
      .regex(LETTER_RE, 'Adresse invalide — indiquez une vraie adresse')
      .optional()
      .or(z.literal('')),
    city: z
      .string()
      .trim()
      .max(80)
      .regex(LETTER_RE, 'Ville invalide')
      .optional()
      .or(z.literal('')),
    phone: algerianPhone.optional().or(z.literal('')),
    delivery_fee: priceSchema,
    min_order: priceSchema,
    estimated_delivery_time: z.number().int().min(5).max(240),
    is_open: z.boolean(),
    accept_orders: z.boolean(),
    cuisine_type: z.string().trim().max(60).optional().or(z.literal('')),
    price_range: z.enum(['$', '$$', '$$$', '$$$$']).optional().or(z.literal('')),
    banner_text: z.string().trim().max(200).optional().or(z.literal('')),
    // 0 = pas de seuil (livraison toujours payante)
    free_delivery_above: z
      .number()
      .nonnegative()
      .max(1_000_000)
      .refine((v) => Math.round(v * 100) === v * 100, 'Max 2 décimales')
      .optional(),
  })
  .refine(
    (d) => !d.free_delivery_above || d.free_delivery_above > d.min_order,
    {
      message: 'Le seuil de livraison gratuite doit être supérieur au minimum de commande',
      path: ['free_delivery_above'],
    },
  );
export type RestaurantUpdateInput = z.infer<typeof restaurantUpdateSchema>;
