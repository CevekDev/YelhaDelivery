import { z } from 'zod';

export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, 'Code invalide (lettres maj, chiffres, _ ou -, 3 à 30 caractères)'),
    discount_type: z.enum(['percent', 'fixed_amount']),
    discount_value: z
      .number()
      .positive('Doit être supérieur à 0')
      .max(1_000_000),
    min_order: z.number().nonnegative().max(1_000_000).default(0),
    max_uses: z.number().int().positive().nullable().optional(),
    expires_at: z.string().nullable().optional(), // ISO date (YYYY-MM-DD)
    is_active: z.boolean().default(true),
  })
  .refine((d) => d.discount_type !== 'percent' || d.discount_value <= 100, {
    message: 'Le pourcentage doit être ≤ 100',
    path: ['discount_value'],
  });

export type PromoCodeInput = z.infer<typeof promoCodeSchema>;

export const promoApplySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, 'Code invalide'),
});

// Validators horaires
export const openingHoursSchema = z.object({
  hours: z
    .array(
      z.object({
        day_of_week: z.number().int().min(1).max(7),
        is_closed: z.boolean(),
        opens_at: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM').optional(),
        closes_at: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM').optional(),
      }),
    )
    .length(7),
});
export type OpeningHoursInput = z.infer<typeof openingHoursSchema>;
