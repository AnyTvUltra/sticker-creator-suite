-- Run this in Supabase SQL Editor if you ran setup.sql before inventory linking was added.
-- It is safe to run more than once.
alter table public.label_products
  add column if not exists inventory_item_id uuid
  references public.inventory_items(id) on delete set null;

create index if not exists label_products_item_idx
  on public.label_products(inventory_item_id);
