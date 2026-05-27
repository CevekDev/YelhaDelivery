import { z } from 'zod';
import { algerianPhone } from './common';

export const livreurCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,32}$/, 'Identifiant invalide (a-z, 0-9, _ — 3 à 32 caractères)'),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)').max(128),
  full_name: z.string().trim().min(1).max(120),
  phone: algerianPhone.optional().or(z.literal('')),
});
export type LivreurCreateInput = z.infer<typeof livreurCreateSchema>;
