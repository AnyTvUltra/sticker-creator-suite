-- Orders: staff create customer orders; managers get real-time notifications.
-- Run once in Supabase > SQL Editor. Safe to run again (idempotent).

-- ---------------------------------------------------------------------------
-- Extend the permissions catalogue
-- ---------------------------------------------------------------------------
create or replace function public.permission_keys() returns text[]
language sql immutable set search_path = '' as $$
  select array[
    'labels.design','labels.print','labels.save','labels.delete',
    'inventory.view','inventory.create','inventory.edit','inventory.stock','inventory.delete',
    'orders.view','orders.create','orders.update','orders.delete'
  ]::text[];
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  username text not null default '',
  customer_name text not null default '' check (char_length(customer_name) <= 120),
  status text not null default 'new' check (status in ('new','preparing','done','cancelled')),
  notes text not null default '' check (char_length(notes) <= 500),
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  name text not null default '' check (char_length(name) <= 160),
  quantity integer not null default 1 check (quantity > 0),
  price numeric(12,2) not null default 0 check (price >= 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;

-- Record who created the order and lock identity fields on update.
create or replace function public.orders_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.user_id := auth.uid();
  new.username := coalesce((select username from public.profiles where user_id = auth.uid()), '');
  return new;
end $$;
drop trigger if exists orders_before_insert on public.orders;
create trigger orders_before_insert before insert on public.orders for each row execute function public.orders_before_insert();

create or replace function public.orders_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id;
  new.username := old.username;
  new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists orders_before_update on public.orders;
create trigger orders_before_update before update on public.orders for each row execute function public.orders_before_update();

-- Managers (orders.view) read every order; staff can still read their own.
drop policy if exists "View orders" on public.orders;
create policy "View orders" on public.orders for select to authenticated
  using (public.has_permission('orders.view') or user_id = auth.uid());
drop policy if exists "Create orders" on public.orders;
create policy "Create orders" on public.orders for insert to authenticated
  with check (auth.uid() = user_id and public.has_permission('orders.create'));
drop policy if exists "Update orders" on public.orders;
create policy "Update orders" on public.orders for update to authenticated
  using (public.has_permission('orders.update')) with check (public.has_permission('orders.update'));
drop policy if exists "Delete orders" on public.orders;
create policy "Delete orders" on public.orders for delete to authenticated
  using (public.has_permission('orders.delete'));

-- Order lines inherit access from the parent order.
drop policy if exists "View order items" on public.order_items;
create policy "View order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (public.has_permission('orders.view') or o.user_id = auth.uid())));
drop policy if exists "Create order items" on public.order_items;
create policy "Create order items" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id
    and (o.user_id = auth.uid() and public.has_permission('orders.create') or public.has_permission('orders.update'))));
drop policy if exists "Update order items" on public.order_items;
create policy "Update order items" on public.order_items for update to authenticated
  using (public.has_permission('orders.update')) with check (public.has_permission('orders.update'));
drop policy if exists "Delete order items" on public.order_items;
create policy "Delete order items" on public.order_items for delete to authenticated
  using (public.has_permission('orders.update') or public.has_permission('orders.delete'));

-- Broadcast new orders over Supabase Realtime so managers get notified live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
