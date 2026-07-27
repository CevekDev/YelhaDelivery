-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260120 : Abonnements (essai gratuit 7 j + offres payantes)
-- ═══════════════════════════════════════════════════════════════════
-- Ajoute :
--   • platform_settings  — config globale éditable depuis /admin/parametres
--                          (jours d'essai, remises, numéro WhatsApp, CCP…).
--   • subscription_plans — les 3 offres (Starter / Pro / Golden), prix éditables.
--   • colonnes d'abonnement sur restaurants (essai + abonnement actif).
--   • subscription_requests — demandes d'achat à valider par l'admin.
--
-- Règle produit : nouveau resto = 7 jours gratuits, puis doit s'abonner.
-- Les restaurants EXISTANTS au moment de la migration sont marqués
-- « abonnés à vie » (subscription_lifetime = true) pour ne couper personne.
--
-- Idempotent : « if not exists » + backfill gardé par trial_started_at IS NULL.
-- Appliquer manuellement dans le SQL Editor Supabase (voir MEMORY).
-- ═══════════════════════════════════════════════════════════════════

-- =====================================================================
-- 1. platform_settings — configuration globale (une seule ligne, id = 1)
-- =====================================================================
create table if not exists public.platform_settings (
  id                  int primary key default 1 check (id = 1),
  trial_days          int not null default 7   check (trial_days between 0 and 365),
  discount_6m_percent int not null default 10  check (discount_6m_percent between 0 and 100),
  discount_12m_percent int not null default 20 check (discount_12m_percent between 0 and 100),
  whatsapp_number     text not null default '',
  ccp_number          text not null default '',
  ccp_name            text not null default '',
  ccp_key             text not null default '',   -- clé/RIP éventuelle
  payment_note        text not null default '',    -- consigne libre affichée au resto
  updated_at          timestamptz not null default now()
);

insert into public.platform_settings (id) values (1)
  on conflict (id) do nothing;

-- =====================================================================
-- 2. subscription_plans — les 3 offres (prix éditables depuis l'admin)
-- =====================================================================
create table if not exists public.subscription_plans (
  id            text primary key,            -- 'starter' | 'pro' | 'golden'
  name          text not null,
  monthly_price numeric(10,2) not null default 0 check (monthly_price >= 0),
  driver_limit  int,                          -- NULL = illimité
  description   text not null default '',
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  updated_at    timestamptz not null default now()
);

insert into public.subscription_plans (id, name, monthly_price, driver_limit, description, sort_order) values
  ('starter', 'Starter', 2500, 1,    '1 seul livreur',       1),
  ('pro',     'Pro',     4500, 3,    'Jusqu''à 3 livreurs',  2),
  ('golden',  'Golden',  7500, null, 'Livreurs illimités',   3)
on conflict (id) do nothing;

-- =====================================================================
-- 3. Colonnes d'abonnement sur restaurants
-- =====================================================================
alter table public.restaurants add column if not exists trial_started_at        timestamptz;
alter table public.restaurants add column if not exists subscription_plan_id     text references public.subscription_plans(id) on delete set null;
alter table public.restaurants add column if not exists subscription_expires_at  timestamptz;
alter table public.restaurants add column if not exists subscription_lifetime    boolean not null default false;
alter table public.restaurants add column if not exists subscription_driver_limit int;  -- NULL = illimité

-- Backfill : restaurants existants (trial_started_at encore NULL) => abonnés à vie.
-- Gardé par « trial_started_at is null » => ne re-marque jamais un resto créé APRÈS
-- la migration (ils ont trial_started_at renseigné par le défaut ci-dessous).
update public.restaurants
   set subscription_lifetime = true,
       trial_started_at = coalesce(trial_started_at, created_at, now())
 where trial_started_at is null;

-- À partir de maintenant, tout nouveau resto démarre son essai à la création.
alter table public.restaurants alter column trial_started_at set default now();
update public.restaurants set trial_started_at = now() where trial_started_at is null;
alter table public.restaurants alter column trial_started_at set not null;

-- =====================================================================
-- 4. subscription_requests — demandes d'achat (validation admin)
-- =====================================================================
create table if not exists public.subscription_requests (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  plan_id         text not null references public.subscription_plans(id),
  plan_name       text not null,
  months          int not null check (months in (1, 6, 12)),
  monthly_price   numeric(10,2) not null,
  discount_percent int not null default 0,
  total_price     numeric(10,2) not null,
  driver_limit    int,                         -- snapshot (NULL = illimité)
  proof_url       text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note      text,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists subscription_requests_restaurant_idx on public.subscription_requests(restaurant_id, created_at desc);
create index if not exists subscription_requests_status_idx on public.subscription_requests(status, created_at desc);

drop trigger if exists set_updated_at on public.subscription_requests;
create trigger set_updated_at before update on public.subscription_requests
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- 5. RLS
-- =====================================================================
alter table public.platform_settings   enable row level security;
alter table public.subscription_plans  enable row level security;
alter table public.subscription_requests enable row level security;

-- platform_settings : lecture ouverte (numéros de paiement affichés au resto),
-- écriture réservée à l'admin.
drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings
  for select using (true);
drop policy if exists platform_settings_update_admin on public.platform_settings;
create policy platform_settings_update_admin on public.platform_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- subscription_plans : lecture ouverte, écriture admin.
drop policy if exists subscription_plans_select on public.subscription_plans;
create policy subscription_plans_select on public.subscription_plans
  for select using (true);
drop policy if exists subscription_plans_update_admin on public.subscription_plans;
create policy subscription_plans_update_admin on public.subscription_plans
  for update using (public.is_admin()) with check (public.is_admin());

-- subscription_requests : le propriétaire voit/insère celles de SON resto ;
-- l'admin voit tout et met à jour (validation).
drop policy if exists subscription_requests_select on public.subscription_requests;
create policy subscription_requests_select on public.subscription_requests
  for select using (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  );
drop policy if exists subscription_requests_insert_owner on public.subscription_requests;
create policy subscription_requests_insert_owner on public.subscription_requests
  for insert with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  );
drop policy if exists subscription_requests_update_admin on public.subscription_requests;
create policy subscription_requests_update_admin on public.subscription_requests
  for update using (public.is_admin()) with check (public.is_admin());
