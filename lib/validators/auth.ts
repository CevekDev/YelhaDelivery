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

/** Identifiant admin (login par username). Mot de passe permissif — c'est
 *  l'admin qui définit sa politique via la page paramètres. */
export const adminUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,32}$/, "Identifiant invalide (lettres, chiffres, _, 3–32 caractères)");

export const adminLoginSchema = z.object({
  username: adminUsernameSchema,
  password: z.string().min(4, 'Mot de passe trop court (min 4)').max(128),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** Changement d'identifiant + / ou mot de passe depuis le panel admin. */
export const adminChangeUsernameSchema = z.object({
  username: adminUsernameSchema,
});

export const adminChangePasswordSchema = z
  .object({
    password: z.string().min(6, 'Mot de passe trop court (min 6)').max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  });
