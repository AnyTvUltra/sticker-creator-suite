-- Custom label templates shared by shop staff.
-- Run this in Supabase SQL Editor. Safe to run more than once.

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
