-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260122 : durcissement sécurité (RLS + triggers)
--
-- Suite à l'audit sécurité — 4 correctifs regroupés :
--
--   1.1 Anti-élévation de privilèges via public.profiles.
--       La policy profiles_update_self autorise un utilisateur à modifier
--       n'importe quelle colonne de SA ligne, y compris role / restaurant_id
--       / is_active → un restaurateur pouvait se donner role='admin'.
--       Trigger BEFORE UPDATE qui restaure ces 3 colonnes à leur valeur OLD,
--       SAUF pour un admin ou un appel privilégié (service_role / postgres :
--       créations de profils via Server Actions, migrations).
--
--   1.2 Suppression des inserts publics directs sur orders / order_items.
--       orders_insert_public / order_items_insert_public permettaient de
--       contourner la RPC place_order() (qui revalide prix / stock / horaires)
--       via un POST REST direct. Aucun code applicatif n'insère en direct
--       (tout passe par place_order, SECURITY DEFINER → hors RLS).
--
--   1.3 Durcissement de l'insert sur order_reviews.
--       "anyone submit review" WITH CHECK (true) laissait insérer un avis pour
--       n'importe quelle commande. Remplacé par une policy qui exige une
--       commande existante, du même restaurant et 'delivered'. La RPC
--       submit_order_review reste fonctionnelle (SECURITY DEFINER → hors RLS).
--
--   1.4 Recalcul serveur des montants de subscription_requests.
--       La policy d'insert ne vérifiait pas la cohérence des prix → un client
--       pouvait forger monthly_price / total_price / discount_percent. Trigger
--       BEFORE INSERT qui réécrit plan_name / monthly_price / driver_limit /
--       discount_percent / total_price à partir de plan_id + months (mirror
--       exact de discountForMonths() + computePlanPrice(), lib/subscription.ts).
--
-- Idempotent.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1.1 Anti-élévation de privilèges sur profiles ────────────────────
-- SECURITY INVOKER (défaut) VOLONTAIRE : on lit current_user pour distinguer
-- un appel privilégié (service_role / postgres) d'un utilisateur authentifié
-- normal. Un SECURITY DEFINER masquerait current_user (= propriétaire).
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Admins et appels privilégiés (service_role via createAdminClient,
  -- migrations sous postgres) peuvent tout modifier. Les autres non.
  IF public.is_admin() OR current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;

  -- Utilisateur authentifié normal : on empêche l'auto-modification des
  -- colonnes sensibles (les autres colonnes — full_name, phone… — passent).
  NEW.role          := OLD.role;
  NEW.restaurant_id := OLD.restaurant_id;
  NEW.is_active     := OLD.is_active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ── 1.2 Contournement de place_order() impossible ────────────────────
DROP POLICY IF EXISTS orders_insert_public ON public.orders;
DROP POLICY IF EXISTS order_items_insert_public ON public.order_items;

-- ── 1.3 order_reviews : insert restreint aux commandes livrées ────────
DROP POLICY IF EXISTS "anyone submit review" ON public.order_reviews;
DROP POLICY IF EXISTS "insert review matches delivered order" ON public.order_reviews;
CREATE POLICY "insert review matches delivered order" ON public.order_reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_reviews.order_id
        AND o.restaurant_id = order_reviews.restaurant_id
        AND o.status = 'delivered'
    )
  );

-- ── 1.4 subscription_requests : recalcul serveur des montants ─────────
CREATE OR REPLACE FUNCTION public.enforce_subscription_request_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan     public.subscription_plans%ROWTYPE;
  v_disc6    int;
  v_disc12   int;
  v_discount int;
BEGIN
  -- Le plan doit exister ET être actif.
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = NEW.plan_id LIMIT 1;
  IF v_plan.id IS NULL OR NOT v_plan.is_active THEN
    RAISE EXCEPTION 'Offre d''abonnement invalide ou inactive';
  END IF;
  IF NEW.months IS NULL OR NEW.months < 1 THEN
    RAISE EXCEPTION 'Durée d''abonnement invalide';
  END IF;

  -- Taux de remise depuis platform_settings (défauts alignés sur
  -- DEFAULT_PLATFORM_SETTINGS : 10 % à 6 mois, 20 % à 12 mois).
  SELECT discount_6m_percent, discount_12m_percent
    INTO v_disc6, v_disc12
    FROM public.platform_settings WHERE id = 1;
  v_disc6  := COALESCE(v_disc6, 10);
  v_disc12 := COALESCE(v_disc12, 20);

  -- Mirror exact de discountForMonths() (lib/subscription.ts).
  v_discount := CASE
    WHEN NEW.months >= 12 THEN v_disc12
    WHEN NEW.months >= 6  THEN v_disc6
    ELSE 0
  END;

  -- Réécriture des montants — quelles que soient les valeurs envoyées.
  -- Mirror exact de computePlanPrice() : total = round(monthly * months * (1 - d/100)).
  NEW.plan_name        := v_plan.name;
  NEW.monthly_price    := v_plan.monthly_price;
  NEW.driver_limit     := v_plan.driver_limit;
  NEW.discount_percent := v_discount;
  NEW.total_price      := ROUND(v_plan.monthly_price * NEW.months * (1 - v_discount / 100.0));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_subscription_request_pricing ON public.subscription_requests;
CREATE TRIGGER enforce_subscription_request_pricing
  BEFORE INSERT ON public.subscription_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_subscription_request_pricing();
