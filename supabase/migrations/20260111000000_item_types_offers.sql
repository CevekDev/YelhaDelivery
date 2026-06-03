-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260111 : item_type, offres du moment, suppléments gratuits
-- ═══════════════════════════════════════════════════════════════════
--
-- Nouveaux champs menu_items :
--   item_type        text  — 'dish' | 'sauce' | 'supplement' | 'offer'
--   offer_badge      text  — Ex: "1+1 gratuit", "Pack famille"
--   offer_description text — Description détaillée de l'offre
--
-- Nouveau champ menu_item_extras :
--   is_free  boolean — true = la sauce/le supplément est offert pour ce plat

-- ── menu_items ────────────────────────────────────────────────────
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'dish'
    CHECK (item_type IN ('dish', 'sauce', 'supplement', 'offer'));

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS offer_badge text,
  ADD COLUMN IF NOT EXISTS offer_description text;

-- Migrer les données existantes :
-- is_extra = true → item_type = 'sauce' (sauces/suppléments déjà créés)
UPDATE menu_items
   SET item_type = 'sauce'
 WHERE is_extra = true
   AND item_type = 'dish';

-- ── menu_item_extras ──────────────────────────────────────────────
ALTER TABLE menu_item_extras
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
