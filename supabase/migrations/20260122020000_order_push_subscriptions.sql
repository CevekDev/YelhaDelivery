-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260122 (ter) : abonnements push CLIENT par commande
--
-- Le client (anonyme, pas de user_id) peut opter pour des notifications push
-- sur SA commande depuis la page de suivi. On stocke l'abonnement lié à
-- l'order_id (et non à un utilisateur, contrairement à push_subscriptions).
--
-- RLS activée SANS aucune policy publique : écriture et lecture se font
-- exclusivement via service_role (Server Actions / lib/push), jamais en REST
-- direct anon/authenticated. Idempotent.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.order_push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, endpoint)
);

CREATE INDEX IF NOT EXISTS order_push_subscriptions_order_idx
  ON public.order_push_subscriptions(order_id);

ALTER TABLE public.order_push_subscriptions ENABLE ROW LEVEL SECURITY;
-- (Volontairement aucune policy : accès réservé au service_role.)
