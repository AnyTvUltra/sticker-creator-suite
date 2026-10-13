-- Run this in Supabase SQL Editor if you ran setup.sql before products were merged into the inventory.
-- It is safe to run more than once. Requires inventory-link.sql (label_products.inventory_item_id).
--
-- An inventory item is the shop's product and its linked label is that product's design, so
-- item-linked labels are shared with all staff; unlinked labels stay private to their owner.
drop policy if exists "Read own products" on public.label_products;
drop policy if exists "Edit own products" on public.label_products;
drop policy if exists "Delete own products" on public.label_products;
create policy "Read own products" on public.label_products for select to authenticated using (
  auth.uid() = user_id or (inventory_item_id is not null and (public.has_permission('labels.design') or public.has_permission('labels.print') or public.has_permission('inventory.view'))));
create policy "Edit own products" on public.label_products for update to authenticated
  using ((auth.uid() = user_id or inventory_item_id is not null) and public.has_permission('labels.save'))
  with check (public.has_permission('labels.save'));
create policy "Delete own products" on public.label_products for delete to authenticated
  using ((auth.uid() = user_id or inventory_item_id is not null) and public.has_permission('labels.delete'));

-- Deleting a staff account keeps the designs of shop products.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_change_self'; end if;
  delete from public.label_products where user_id = p_user_id and inventory_item_id is null;
  delete from auth.users where id = p_user_id;
end $$;
