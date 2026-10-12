-- S3R setup: users & permissions, saved labels, inventory.
-- Run the whole file once in Supabase > SQL Editor. Safe to run again.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Permissions catalogue (keep in sync with src/lib/permissions.ts)
-- ---------------------------------------------------------------------------
create or replace function public.permission_keys() returns text[]
language sql immutable set search_path = '' as $$
  select array[
    'labels.design','labels.print','labels.save','labels.delete',
    'inventory.view','inventory.create','inventory.edit','inventory.stock','inventory.delete'
  ]::text[];
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.-]{2,60}$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  is_admin boolean not null default false,
  active boolean not null default true,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where user_id = auth.uid() and is_admin and active);
$$;

create or replace function public.has_permission(perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where user_id = auth.uid() and active and (is_admin or perm = any(permissions)));
$$;

drop policy if exists "Read own or admin" on public.profiles;
create policy "Read own or admin" on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Create a profile automatically for every new <username>@s3r.local account.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_username text := split_part(lower(new.email), '@', 1);
begin
  if lower(new.email) like '%@s3r.local' and v_username ~ '^[a-z0-9_.-]{2,60}$' then
    insert into public.profiles (user_id, username) values (new.id, v_username) on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------
create or replace function public.clean_permissions(p text[]) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array(select distinct x from unnest(coalesce(p, '{}')) x where x = any(public.permission_keys()) order by x), '{}');
$$;

create or replace function public.admin_list_users()
returns table (user_id uuid, username text, display_name text, is_admin boolean, active boolean, permissions text[], created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  return query
    select p.user_id, p.username, p.display_name, p.is_admin, p.active, p.permissions, p.created_at, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.user_id
    order by p.is_admin desc, p.created_at;
end $$;

create or replace function public.admin_create_user(p_username text, p_password text, p_display_name text, p_is_admin boolean, p_permissions text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_username text := lower(trim(p_username));
  v_email text;
  v_id uuid := gen_random_uuid();
  v_col text;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_username !~ '^[a-z0-9_.-]{2,60}$' then raise exception 'invalid_username'; end if;
  if char_length(coalesce(p_password, '')) < 6 then raise exception 'weak_password'; end if;
  v_email := v_username || '@s3r.local';
  if exists(select 1 from auth.users where lower(email) = v_email) or exists(select 1 from public.profiles where username = v_username) then
    raise exception 'username_taken';
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('username', v_username), now(), now(),
    '', '', '', '');

  -- GoTrue cannot read NULL in these text columns; blank whichever exist in this auth version.
  for v_col in
    select column_name from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and column_name in ('email_change_token_current', 'phone_change', 'phone_change_token', 'reauthentication_token')
  loop
    execute format('update auth.users set %I = coalesce(%I, '''') where id = $1', v_col, v_col) using v_id;
  end loop;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), 'email', now(), now(), now());

  insert into public.profiles (user_id, username, display_name, is_admin, permissions)
  values (v_id, v_username, left(coalesce(trim(p_display_name), ''), 80), coalesce(p_is_admin, false), public.clean_permissions(p_permissions))
  on conflict (user_id) do update set display_name = excluded.display_name, is_admin = excluded.is_admin, permissions = excluded.permissions;
  return v_id;
end $$;

create or replace function public.admin_update_user(p_user_id uuid, p_display_name text, p_is_admin boolean, p_active boolean, p_permissions text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_user_id = auth.uid() and (not p_is_admin or not p_active) then raise exception 'cannot_change_self'; end if;
  update public.profiles set display_name = left(coalesce(trim(p_display_name), ''), 80), is_admin = p_is_admin,
    active = p_active, permissions = public.clean_permissions(p_permissions)
  where user_id = p_user_id;
  if not found then raise exception 'not_found'; end if;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end, updated_at = now() where id = p_user_id;
  if not p_active then delete from auth.sessions where user_id = p_user_id; end if;
end $$;

create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if char_length(coalesce(p_password, '')) < 6 then raise exception 'weak_password'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = p_user_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_change_self'; end if;
  delete from public.label_products where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
end $$;

-- ---------------------------------------------------------------------------
-- Saved label designs (private per user)
-- ---------------------------------------------------------------------------
create table if not exists public.label_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  data jsonb not null default '{}'::jsonb,
  layout jsonb not null default '[]'::jsonb,
  theme text not null default 'mint',
  updated_at timestamptz not null default now()
);
create index if not exists label_products_owner_idx on public.label_products(user_id);
grant select, insert, update, delete on public.label_products to authenticated;
grant all on public.label_products to service_role;
alter table public.label_products enable row level security;
drop policy if exists "Read own products" on public.label_products;
drop policy if exists "Create own products" on public.label_products;
drop policy if exists "Edit own products" on public.label_products;
drop policy if exists "Delete own products" on public.label_products;
create policy "Read own products" on public.label_products for select to authenticated using (auth.uid() = user_id);
create policy "Create own products" on public.label_products for insert to authenticated
  with check (auth.uid() = user_id and public.has_permission('labels.save'));
create policy "Edit own products" on public.label_products for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id and public.has_permission('labels.save'));
create policy "Delete own products" on public.label_products for delete to authenticated
  using (auth.uid() = user_id and public.has_permission('labels.delete'));

-- ---------------------------------------------------------------------------
-- Inventory (shared by the whole store)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  model text not null default '' check (char_length(model) <= 100),
  category text not null default '' check (char_length(category) <= 60),
  sku text not null default '' check (char_length(sku) <= 60),
  barcode text not null default '' check (char_length(barcode) <= 500),
  color text not null default '' check (char_length(color) <= 60),
  size text not null default '' check (char_length(size) <= 60),
  warranty text not null default '' check (char_length(warranty) <= 100),
  specs text not null default '' check (char_length(specs) <= 500),
  location text not null default '' check (char_length(location) <= 60),
  notes text not null default '' check (char_length(notes) <= 1000),
  image text not null default '' check (char_length(image) <= 3000000),
  price numeric(14,2) not null default 0 check (price >= 0),
  cost numeric(14,2) not null default 0 check (cost >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  min_quantity integer not null default 0 check (min_quantity >= 0),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inventory_items_name_idx on public.inventory_items(name);
create index if not exists inventory_items_barcode_idx on public.inventory_items(barcode);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  delta integer not null,
  quantity_after integer not null,
  note text not null default '' check (char_length(note) <= 200),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  username text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_item_idx on public.inventory_movements(item_id, created_at desc);

grant select, insert, update, delete on public.inventory_items to authenticated;
grant select on public.inventory_movements to authenticated;
grant all on public.inventory_items, public.inventory_movements to service_role;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "View inventory" on public.inventory_items;
drop policy if exists "Create inventory" on public.inventory_items;
drop policy if exists "Edit inventory" on public.inventory_items;
drop policy if exists "Delete inventory" on public.inventory_items;
create policy "View inventory" on public.inventory_items for select to authenticated using (public.has_permission('inventory.view'));
create policy "Create inventory" on public.inventory_items for insert to authenticated with check (public.has_permission('inventory.create'));
create policy "Edit inventory" on public.inventory_items for update to authenticated
  using (public.has_permission('inventory.edit')) with check (public.has_permission('inventory.edit'));
create policy "Delete inventory" on public.inventory_items for delete to authenticated using (public.has_permission('inventory.delete'));
drop policy if exists "View movements" on public.inventory_movements;
create policy "View movements" on public.inventory_movements for select to authenticated using (public.has_permission('inventory.view'));

-- Quantities only change through adjust_stock so every change is logged.
create or replace function public.inventory_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.quantity is distinct from old.quantity and coalesce(current_setting('s3r.stock_adjust', true), '') <> 'on' then
    raise exception 'use_adjust_stock';
  end if;
  new.updated_at := now();
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists inventory_before_update on public.inventory_items;
create trigger inventory_before_update before update on public.inventory_items for each row execute function public.inventory_before_update();

create or replace function public.inventory_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.inventory_movements (item_id, delta, quantity_after, note, user_id, username)
  values (new.id, new.quantity, new.quantity, 'initial', auth.uid(), coalesce((select username from public.profiles where user_id = auth.uid()), ''));
  return new;
end $$;
drop trigger if exists inventory_after_insert on public.inventory_items;
create trigger inventory_after_insert after insert on public.inventory_items for each row execute function public.inventory_after_insert();

create or replace function public.adjust_stock(p_item uuid, p_delta integer, p_note text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare v_old integer; v_new integer;
begin
  if not public.has_permission('inventory.stock') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_delta is null or p_delta = 0 then raise exception 'invalid_delta'; end if;
  select quantity into v_old from public.inventory_items where id = p_item for update;
  if not found then raise exception 'not_found'; end if;
  v_new := v_old + p_delta;
  if v_new < 0 then raise exception 'insufficient_stock'; end if;
  perform set_config('s3r.stock_adjust', 'on', true);
  update public.inventory_items set quantity = v_new where id = p_item;
  perform set_config('s3r.stock_adjust', 'off', true);
  insert into public.inventory_movements (item_id, delta, quantity_after, note, user_id, username)
  values (p_item, p_delta, v_new, left(coalesce(p_note, ''), 200), auth.uid(), coalesce((select username from public.profiles where user_id = auth.uid()), ''));
  return v_new;
end $$;

-- Saved labels can be linked to an inventory item.
alter table public.label_products add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete set null;
create index if not exists label_products_item_idx on public.label_products(inventory_item_id);

-- Custom label templates shared by shop staff.
create table if not exists public.label_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default '',
  elements jsonb not null default '[]'::jsonb,
  theme text not null default 'mint',
  store text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.label_templates enable row level security;
grant select, insert, update, delete on public.label_templates to authenticated;
grant all on public.label_templates to service_role;
drop policy if exists "Read templates" on public.label_templates;
drop policy if exists "Create templates" on public.label_templates;
drop policy if exists "Edit templates" on public.label_templates;
drop policy if exists "Delete templates" on public.label_templates;
create policy "Read templates" on public.label_templates for select to authenticated
  using (public.has_permission('labels.design'));
create policy "Create templates" on public.label_templates for insert to authenticated
  with check (auth.uid() = user_id and public.has_permission('labels.save'));
create policy "Edit templates" on public.label_templates for update to authenticated
  using (public.has_permission('labels.save')) with check (public.has_permission('labels.save'));
create policy "Delete templates" on public.label_templates for delete to authenticated
  using (public.has_permission('labels.delete'));

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.inventory_after_insert() from public, anon, authenticated;
revoke all on function public.inventory_before_update() from public, anon, authenticated;
revoke all on function public.is_admin(), public.has_permission(text), public.permission_keys(), public.clean_permissions(text[]),
  public.admin_list_users(), public.admin_create_user(text, text, text, boolean, text[]),
  public.admin_update_user(uuid, text, boolean, boolean, text[]), public.admin_set_password(uuid, text),
  public.admin_delete_user(uuid), public.adjust_stock(uuid, integer, text) from public, anon;
grant execute on function public.is_admin(), public.has_permission(text), public.permission_keys(), public.clean_permissions(text[]),
  public.admin_list_users(), public.admin_create_user(text, text, text, boolean, text[]),
  public.admin_update_user(uuid, text, boolean, boolean, text[]), public.admin_set_password(uuid, text),
  public.admin_delete_user(uuid), public.adjust_stock(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill profiles for existing accounts; "admin" becomes the first administrator.
-- ---------------------------------------------------------------------------
insert into public.profiles (user_id, username, is_admin)
select id, split_part(lower(email), '@', 1), lower(email) = 'admin@s3r.local'
from auth.users
where lower(email) like '%@s3r.local' and split_part(lower(email), '@', 1) ~ '^[a-z0-9_.-]{2,60}$'
on conflict (user_id) do update set is_admin = public.profiles.is_admin or excluded.is_admin;
