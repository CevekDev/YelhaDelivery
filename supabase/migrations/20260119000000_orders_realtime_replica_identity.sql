-- =====================================================================
-- Realtime + RLS : REPLICA IDENTITY FULL sur orders / order_items.
--
-- Les tables sont déjà dans la publication supabase_realtime, mais sous RLS
-- Supabase Realtime doit évaluer la policy sur l'ANCIENNE ligne lors d'un
-- UPDATE/DELETE. Avec REPLICA IDENTITY DEFAULT, l'ancienne ligne ne contient
-- que la clé primaire → l'évaluation RLS échoue → les événements UPDATE ne sont
-- PAS diffusés (les INSERT passent). Résultat : le dashboard commandes ne se
-- met pas à jour en direct quand un statut change (il fallait rafraîchir).
--
-- FULL fait que le WAL inclut toutes les colonnes de l'ancienne ligne → Realtime
-- peut évaluer la RLS → les UPDATE sont diffusés. Idempotent.
-- =====================================================================

alter table public.orders replica identity full;
alter table public.order_items replica identity full;
