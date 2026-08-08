-- ─────────────────────────────────────────────────────────────────
-- Migration 20260124 : vérification email à l'inscription + rappel d'abonnement
--
--   • pending_signups : stocke le code de vérification à 6 chiffres (hashé)
--     envoyé par email au moment de l'inscription. Le compte auth/profil/
--     restaurant n'est créé QU'APRÈS saisie du bon code → pas de compte
--     fantôme ni de slug public pollué. Table réservée au service_role.
--
--   • restaurants.expiry_reminder_sent_for : dé-doublonnage du rappel « J-3 ».
--     On y enregistre la date d'échéance déjà rappelée ; un nouveau rappel
--     ne repart que si l'échéance change (renouvellement).
-- ─────────────────────────────────────────────────────────────────

-- 1) File d'attente des inscriptions non vérifiées -----------------------------
create table if not exists public.pending_signups (
  email      text        primary key,
  code_hash  text        not null,          -- SHA-256 du code à 6 chiffres
  expires_at timestamptz not null,          -- validité 15 min
  attempts   int         not null default 0, -- verrou anti-bruteforce (max 5)
  created_at timestamptz not null default now()
);

-- RLS activée SANS aucune policy : la table n'est accessible que via le
-- service_role (client admin côté serveur), qui bypass RLS. Aucun accès
-- possible avec la clé anon / un utilisateur connecté.
alter table public.pending_signups enable row level security;

-- 2) Dé-doublonnage du rappel d'expiration -------------------------------------
alter table public.restaurants
  add column if not exists expiry_reminder_sent_for timestamptz;
