import { z } from 'zod';

export const emailLoginSchema = z.object({
  email: z.string().trim().email('Adresse email invalide').max(254),
  password: z.string().min(8, 'Mot de passe trop court (min 8 caractères)').max(128),
});
export type EmailLoginInput = z.infer<typeof emailLoginSchema>;

export const usernameLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,32}$/, "Identifiant invalide (lettres, chiffres, _, 3–32 caractères)"),
  password: z.string().min(6, 'Mot de passe trop court').max(128),
});
export type UsernameLoginInput = z.infer<typeof usernameLoginSchema>;
