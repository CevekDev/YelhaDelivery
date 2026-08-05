import { z } from 'zod';

/** Téléphone algérien : 05, 06 ou 07 suivi de 8 chiffres. */
export const algerianPhone = z
  .string()
  .trim()
  .regex(/^0[5-7][0-9]{8}$/, 'Numéro de téléphone algérien invalide (ex: 0555123456)');

/** Slug : minuscules, chiffres, tirets. 3–80 caractères. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug invalide (lettres minuscules, chiffres et tirets)')
  .min(3)
  .max(80);

/**
 * Contient au moins une lettre (tout alphabet : latin accentué, arabe, etc.).
 * Sert à rejeter les saisies composées uniquement de chiffres ou de symboles
 * là où l'on attend un vrai texte (nom, adresse, ville…).
 */
export const LETTER_RE = /\p{L}/u;

/** Nom de personne : longueur minimale + doit contenir des lettres. */
export const personNameSchema = z
  .string()
  .trim()
  .min(2, 'Nom trop court')
  .max(120)
  .regex(LETTER_RE, 'Le nom doit contenir des lettres, pas seulement des chiffres');

/** Adresse : longueur minimale + doit contenir des lettres (pas que des chiffres). */
export const addressSchema = z
  .string()
  .trim()
  .min(5, 'Adresse trop courte')
  .max(500)
  .regex(LETTER_RE, 'Adresse invalide — indiquez une vraie adresse (rue, quartier…)');

/** Prix : entier ou décimal positif avec max 2 décimales. */
export const priceSchema = z
  .number({ invalid_type_error: 'Prix invalide' })
  .nonnegative('Le prix doit être positif')
  .max(1_000_000, 'Prix trop élevé')
  .refine((v) => Math.round(v * 100) === v * 100, 'Max 2 décimales');
