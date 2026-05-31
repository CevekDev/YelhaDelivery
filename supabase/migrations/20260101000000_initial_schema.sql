-- =====================================================================
-- YelhaDelivery — Schéma initial
-- Tables, contraintes, index, RLS policies, triggers, fonctions
-- =====================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =====================================================================
-- ENUMS (via check constraints pour portabilité)
-- =====================================================================
-- role: admin | restaurateur | livreur
-- order status: pending | confirmed | preparing | assigned | on_the_way | delivered | cancelled
-- restaurant status: active | suspended | pending

-- =====================================================================
-- Table: restaurants
-- =====================================================================
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,  -- FK ajoutée après profiles (cycle)
  name text not null check (char_length(name) between 1 and 120),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  description text check (char_length(description) <= 500),
  address text check (char_length(address) <= 300),
  city text check (char_length(city) <= 80),
  phone text check (phone ~ '^0[5-7][0-9]{8}$'),
  logo_url text,
  cover_url text,
  is_open boolean not null default false,
  accept_orders boolean not null default true,
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  min_order numeric(10,2) not null default 0 check (min_order >= 0),
  estimated_delivery_time int not null default 30 check (estimated_delivery_time between 5 and 240),
  status text not null default 'active' check (status in ('active','suspended','pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index restaurants_owner_id_idx on public.restaurants(owner_id);
create index restaurants_status_idx on public.restaurants(status);

-- =====================================================================
-- Table: profiles (extension de auth.users)
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','restaurateur','livreur')),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  username citext unique check (username is null or (username ~ '^[a-z0-9_]{3,32}$')),
  full_name text check (full_name is null or char_length(full_name) between 1 and 120),
  phone text check (phone is null or phone ~ '^0[5-7][0-9]{8}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un livreur DOIT avoir un restaurant_id ; un admin n'en a pas ; un restaurateur peut en avoir un.
  constraint profiles_role_restaurant_check check (
    (role = 'livreur' and restaurant_id is not null) or role <> 'livreur'
  ),
  constraint profiles_admin_no_restaurant check (
    (role = 'admin' and restaurant_id is null) or role <> 'admin'
  )
);
create index profiles_restaurant_id_idx on public.profiles(restaurant_id);
create index profiles_role_idx on public.profiles(role);

-- FK retour : restaurants.owner_id -> profiles.id
alter table public.restaurants
  add constraint restaurants_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete set null;

-- =====================================================================
-- Table: menu_categories
-- =====================================================================
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index menu_categories_restaurant_idx on public.menu_categories(restaurant_id, sort_order);

-- =====================================================================
-- Table: menu_items
-- =====================================================================
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  price numeric(10,2) not null check (price >= 0 and price <= 1000000),
  image_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_restaurant_idx on public.menu_items(restaurant_id, sort_order);
create index menu_items_category_idx on public.menu_items(category_id);

-- =====================================================================
-- Table: orders
-- =====================================================================
create sequence if not exists public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,  -- format YDZ-YYYYMMDD-XXXX, généré par trigger
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  driver_id uuid references public.profiles(id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_phone text not null check (customer_phone ~ '^0[5-7][0-9]{8}$'),
  customer_address text not null check (char_length(customer_address) between 5 and 500),
  status text not null default 'pending' check (
    status in ('pending','confirmed','preparing','assigned','on_the_way','delivered','cancelled')
  ),
  payment_method text not null default 'cash' check (payment_method in ('cash')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_restaurant_status_idx on public.orders(restaurant_id, status);
create index orders_restaurant_created_idx on public.orders(restaurant_id, created_at desc);
create index orders_driver_idx on public.orders(driver_id, status) where driver_id is not null;

-- =====================================================================
-- Table: order_items
-- =====================================================================
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,         -- snapshot
  item_price numeric(10,2) not null check (item_price >= 0),  -- snapshot
  quantity int not null check (quantity between 1 and 100),
  subtotal numeric(10,2) not null check (subtotal >= 0)
);
create index order_items_order_idx on public.order_items(order_id);

-- =====================================================================
-- Table: notifications
-- =====================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text check (body is null or char_length(body) <= 1000),
  type text not null check (char_length(type) between 1 and 50),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_read_idx on public.notifications(user_id, read, created_at desc);
create index notifications_restaurant_idx on public.notifications(restaurant_id, created_at desc);

-- =====================================================================
-- Trigger: updated_at automatique
-- =====================================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at before update on public.restaurants
  for each row execute function public.tg_set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger menu_items_set_updated_at before update on public.menu_items
  for each row execute function public.tg_set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- Trigger: génération order_number (YDZ-YYYYMMDD-XXXX)
-- =====================================================================
create or replace function public.tg_set_order_number()
returns trigger language plpgsql as $$
declare
  next_id bigint;
begin
  if new.order_number is null or new.order_number = '' then
    next_id := nextval('public.order_number_seq');
    new.order_number := 'YDZ-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(next_id::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger orders_set_order_number before insert on public.orders
  for each row execute function public.tg_set_order_number();

-- =====================================================================
-- Helper functions (SECURITY DEFINER) pour RLS sans récursion
-- =====================================================================
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_restaurant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select restaurant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

-- =====================================================================
-- RLS — activation sur toutes les tables
-- =====================================================================
alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;

-- ---------- profiles ----------
-- Un utilisateur voit son propre profil ; un admin voit tout ; un restaurateur voit les profils de son restaurant.
create policy profiles_select_self on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (public.current_role_name() = 'restaurateur' and restaurant_id = public.current_restaurant_id())
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- INSERT / DELETE de profils : réservé au service_role (création admin/livreur via Server Actions).

-- ---------- restaurants ----------
-- SELECT public : tout le monde peut lire un restaurant actif (pour la page /r/[slug]).
create policy restaurants_select_public on public.restaurants
  for select using (
    status = 'active'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy restaurants_update_owner on public.restaurants
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- INSERT / DELETE : admin uniquement (via service_role en pratique).
create policy restaurants_insert_admin on public.restaurants
  for insert with check (public.is_admin());

create policy restaurants_delete_admin on public.restaurants
  for delete using (public.is_admin());

-- ---------- menu_categories ----------
create policy menu_categories_select_public on public.menu_categories
  for select using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'active')
    or restaurant_id = public.current_restaurant_id()
    or public.is_admin()
  );

create policy menu_categories_mutate_owner on public.menu_categories
  for all using (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  );

-- ---------- menu_items ----------
create policy menu_items_select_public on public.menu_items
  for select using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'active')
    or restaurant_id = public.current_restaurant_id()
    or public.is_admin()
  );

create policy menu_items_mutate_owner on public.menu_items
  for all using (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
  );

-- ---------- orders ----------
-- SELECT :
--   * restaurateur : toutes les commandes de son restaurant
--   * livreur : uniquement les commandes qui lui sont assignées
--   * admin : tout
--   * client anonyme : la commande qu'il vient de créer (via lookup par id, pas listing)
--     -> on autorise SELECT public uniquement pour un id précis. Pour des raisons de simplicité,
--        on rend les commandes lisibles par les anonymes par id seulement via une fonction RPC
--        ou en passant par un endpoint server. Ici on garde RLS stricte et on lit via service_role
--        côté serveur dans la page de suivi.
create policy orders_select_staff on public.orders
  for select using (
    public.is_admin()
    or (public.current_role_name() = 'restaurateur' and restaurant_id = public.current_restaurant_id())
    or (public.current_role_name() = 'livreur' and driver_id = auth.uid())
  );

-- INSERT public (création de commande par un client anonyme) : autorisée, mais les valeurs sensibles
-- (driver_id, status) sont contraintes par check ci-dessous.
create policy orders_insert_public on public.orders
  for insert with check (
    driver_id is null
    and status = 'pending'
    and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'active' and r.accept_orders and r.is_open)
  );

create policy orders_update_staff on public.orders
  for update using (
    public.is_admin()
    or (public.current_role_name() = 'restaurateur' and restaurant_id = public.current_restaurant_id())
    or (public.current_role_name() = 'livreur' and driver_id = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.current_role_name() = 'restaurateur' and restaurant_id = public.current_restaurant_id())
    or (public.current_role_name() = 'livreur' and driver_id = auth.uid())
  );

-- DELETE : admin uniquement
create policy orders_delete_admin on public.orders
  for delete using (public.is_admin());

-- ---------- order_items ----------
create policy order_items_select_staff on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          public.is_admin()
          or (public.current_role_name() = 'restaurateur' and o.restaurant_id = public.current_restaurant_id())
          or (public.current_role_name() = 'livreur' and o.driver_id = auth.uid())
        )
    )
  );

create policy order_items_insert_public on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.status = 'pending')
  );

-- ---------- notifications ----------
create policy notifications_select_own on public.notifications
  for select using (
    user_id = auth.uid()
    or (public.current_role_name() = 'restaurateur' and restaurant_id = public.current_restaurant_id())
    or public.is_admin()
  );

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- Realtime : on ajoute orders et order_items à la publication realtime
-- =====================================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.notifications;

-- =====================================================================
-- Storage bucket pour les images de restaurants (à créer côté Supabase Dashboard
-- ou via le seed. Politique de lecture publique, écriture restreinte aux propriétaires.)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', true)
on conflict (id) do nothing;

-- Lecture publique
drop policy if exists "restaurant-images public read" on storage.objects;
create policy "restaurant-images public read" on storage.objects
  for select using (bucket_id = 'restaurant-images');

-- Écriture : authentifié, dans un dossier nommé d'après son restaurant_id
drop policy if exists "restaurant-images owner write" on storage.objects;
create policy "restaurant-images owner write" on storage.objects
  for insert with check (
    bucket_id = 'restaurant-images'
    and (
      public.is_admin()
      or (split_part(name, '/', 1) = public.current_restaurant_id()::text)
    )
  );

drop policy if exists "restaurant-images owner delete" on storage.objects;
create policy "restaurant-images owner delete" on storage.objects
  for delete using (
    bucket_id = 'restaurant-images'
    and (
      public.is_admin()
      or (split_part(name, '/', 1) = public.current_restaurant_id()::text)
    )
  );
