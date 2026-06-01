-- ─────────────────────────────────────────────────────────────────
-- Migration 20260108 : suppléments liés aux plats + multi-images
-- ─────────────────────────────────────────────────────────────────

-- 1. Colonnes images supplémentaires sur menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- 2. Table de jonction plat ↔ suppléments disponibles
CREATE TABLE IF NOT EXISTS menu_item_extras (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id   uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  extra_item_id  uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_extra UNIQUE (menu_item_id, extra_item_id),
  -- un extra ne peut pas être lié à lui-même
  CONSTRAINT no_self_extra CHECK (menu_item_id <> extra_item_id)
);

ALTER TABLE menu_item_extras ENABLE ROW LEVEL SECURITY;

-- Les restaurateurs gèrent les extras de leurs propres plats
CREATE POLICY "restaurateurs manage item extras"
  ON menu_item_extras FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM menu_items mi
      JOIN profiles p ON p.restaurant_id = mi.restaurant_id
      WHERE mi.id = menu_item_extras.menu_item_id
        AND p.id = auth.uid()
        AND p.role IN ('restaurateur', 'admin')
    )
  );

-- Lecture publique (clients qui consultent le menu)
CREATE POLICY "public read item extras"
  ON menu_item_extras FOR SELECT
  USING (true);
