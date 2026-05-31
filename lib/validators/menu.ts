import { z } from 'zod';
import { priceSchema } from './common';

export const menuCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_visible: z.boolean().default(true),
});
export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;

export const menuItemSchema = z
  .object({
    category_id: z.string().uuid().nullable(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional().or(z.literal('')),
    price: priceSchema,
    promo_price: z
      .number()
      .nonnegative()
      .max(1_000_000)
      .refine((v) => Math.round(v * 100) === v * 100, 'Max 2 décimales')
      .optional()
      .nullable(),
    is_extra: z.boolean().default(false),
    is_available: z.boolean().default(true),
    sort_order: z.number().int().min(0).max(999).default(0),
  })
  .refine(
    (d) => d.promo_price === undefined || d.promo_price === null || d.promo_price < d.price,
    {
      message: 'Le prix promo doit être inférieur au prix normal',
      path: ['promo_price'],
    },
  );
export type MenuItemInput = z.infer<typeof menuItemSchema>;

/** Validation upload image (côté serveur, sur File/Blob). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
