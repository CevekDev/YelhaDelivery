import { z } from 'zod';
import { algerianPhone, slugSchema } from './common';

export const restaurateurRegisterSchema = z
  .object({
    restaurant_name: z.string().trim().min(1, 'Nom du restaurant requis').max(120),
    slug: slugSchema,
    owner_full_name: z.string().trim().min(2, 'Nom trop court').max(120),
    owner_email: z.string().trim().toLowerCase().email('Email invalide').max(254),
    owner_phone: algerianPhone.optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Mot de passe trop court (min 8 caractères)')
      .max(128)
      .regex(/[A-Za-z]/, 'Doit contenir au moins une lettre')
      .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
    password_confirm: z.string(),
    accept_terms: z.literal('on', {
      errorMap: () => ({ message: "Vous devez accepter les conditions d'utilisation" }),
    }),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password_confirm'],
  });
export type RestaurateurRegisterInput = z.infer<typeof restaurateurRegisterSchema>;
