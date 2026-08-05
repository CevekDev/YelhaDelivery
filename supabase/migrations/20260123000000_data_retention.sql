-- ─────────────────────────────────────────────────────────────────
-- Migration 20260123 : rétention des données (purge automatique 60 jours)
--
--   • Commandes    : supprimées 60 j après leur création (tous statuts).
--   • Comptes bannis, 60 j après le bannissement :
--       - restaurants suspendus (status = 'suspended')  → suppression du
--         restaurant + tout son contenu (menu, commandes, avis…) + comptes
--         (propriétaire, livreurs) ;
--       - utilisateurs désactivés (is_active = false, hors admin) → suppression
--         du compte de connexion (cascade sur le profil).
--
--   Déclenchée quotidiennement par un cron Vercel qui appelle
--   public.cleanup_expired_data() via le service_role.
-- ─────────────────────────────────────────────────────────────────

-- 1) Horodatage du bannissement ------------------------------------------------
alter table public.restaurants add column if not exists suspended_at   timestamptz;
alter table public.profiles    add column if not exists deactivated_at timestamptz;

-- 2) Triggers : maintiennent ces horodatages automatiquement -------------------
--    (couvre toutes les voies : actions admin, toggle livreur, etc.)
create or replace function public.tg_track_restaurant_suspension()
returns trigger language plpgsql as $$
begin
  if new.status = 'suspended' and coalesce(old.status, '') <> 'suspended' then
    new.suspended_at := now();          -- vient d'être suspendu
  elsif new.status <> 'suspended' then
    new.suspended_at := null;           -- réactivé / remis en attente
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_track_suspension on public.restaurants;
create trigger restaurants_track_suspension
  before update of status on public.restaurants
  for each row execute function public.tg_track_restaurant_suspension();

create or replace function public.tg_track_profile_deactivation()
returns trigger language plpgsql as $$
begin
  if new.is_active = false and coalesce(old.is_active, true) = true then
    new.deactivated_at := now();        -- vient d'être désactivé
  elsif new.is_active = true then
    new.deactivated_at := null;         -- réactivé
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_track_deactivation on public.profiles;
create trigger profiles_track_deactivation
  before update of is_active on public.profiles
  for each row execute function public.tg_track_profile_deactivation();

-- 3) Backfill : fenêtre de 60 j à partir de MAINTENANT pour l'existant ---------
--    (évite de supprimer instantanément des comptes déjà bannis)
update public.restaurants set suspended_at   = now()
  where status = 'suspended' and suspended_at is null;
update public.profiles    set deactivated_at = now()
  where is_active = false and deactivated_at is null;

-- 4) Fonction de purge ---------------------------------------------------------
create or replace function public.cleanup_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cutoff        timestamptz := now() - interval '60 days';
  v_rest_ids      uuid[];
  v_user_ids      uuid[];
  v_orders_purged bigint := 0;
  v_users_purged  bigint := 0;
  v_rests_purged  bigint := 0;
  v_orders_old    bigint := 0;
begin
  -- Restaurants à purger : suspendus depuis > 60 j, plus ceux dont le
  -- propriétaire est un utilisateur désactivé depuis > 60 j.
  select coalesce(array_agg(distinct id), '{}'::uuid[]) into v_rest_ids
  from (
    select id from public.restaurants
      where status = 'suspended'
        and suspended_at is not null and suspended_at < v_cutoff
    union
    select r.id from public.restaurants r
      join public.profiles p on p.id = r.owner_id
      where p.is_active = false
        and p.deactivated_at is not null and p.deactivated_at < v_cutoff
  ) s;

  -- Comptes à purger :
  --   • utilisateurs désactivés > 60 j (hors admin)
  --   • propriétaires des restaurants purgés (sauf s'ils possèdent encore un
  --     autre restaurant NON purgé → on ne supprime pas leur accès)
  --   • livreurs rattachés aux restaurants purgés
  select coalesce(array_agg(distinct id), '{}'::uuid[]) into v_user_ids
  from (
    select id from public.profiles
      where is_active = false and deactivated_at is not null
        and deactivated_at < v_cutoff and role <> 'admin'
    union
    select r.owner_id as id from public.restaurants r
      where r.id = any(v_rest_ids) and r.owner_id is not null
        and not exists (
          select 1 from public.restaurants r2
          where r2.owner_id = r.owner_id and r2.id <> all(v_rest_ids)
        )
    union
    select id from public.profiles where restaurant_id = any(v_rest_ids)
  ) u
  where id is not null;

  -- 1) Commandes des restaurants purgés (orders.restaurant_id est RESTRICT).
  delete from public.orders where restaurant_id = any(v_rest_ids);
  get diagnostics v_orders_purged = row_count;

  -- 2) Comptes auth (cascade → profils + notifications). AVANT la suppression
  --    des restaurants : sinon le SET NULL sur restaurant_id des livreurs
  --    violerait la contrainte « livreur ⇒ restaurant_id NOT NULL ».
  delete from auth.users where id = any(v_user_ids);
  get diagnostics v_users_purged = row_count;

  -- 3) Restaurants purgés (cascade → menu, catégories, horaires, promos, avis…).
  delete from public.restaurants where id = any(v_rest_ids);
  get diagnostics v_rests_purged = row_count;

  -- 4) Commandes de plus de 60 j (restaurants restants).
  delete from public.orders where created_at < v_cutoff;
  get diagnostics v_orders_old = row_count;

  return jsonb_build_object(
    'ran_at', now(),
    'cutoff', v_cutoff,
    'restaurants_purged', v_rests_purged,
    'accounts_purged', v_users_purged,
    'orders_from_purged_restaurants', v_orders_purged,
    'old_orders_purged', v_orders_old
  );
end;
$$;

-- Réservé au service_role (appel via le cron), jamais exposé au public.
revoke all     on function public.cleanup_expired_data() from public;
grant  execute on function public.cleanup_expired_data() to service_role;
