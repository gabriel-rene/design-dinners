-- Supabase is intentionally limited to admin identity and image storage.
-- Events and speakers live in Neon (see db/001_initial.sql).

create table if not exists public.admins (
  email text primary key
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where email = (auth.jwt() ->> 'email')
  )
$$;

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = excluded.public;

create policy "public read images"
on storage.objects for select
using (bucket_id = 'images');

create policy "admin insert images"
on storage.objects for insert
with check (bucket_id = 'images' and public.is_admin());

create policy "admin update images"
on storage.objects for update
using (bucket_id = 'images' and public.is_admin());

create policy "admin delete images"
on storage.objects for delete
using (bucket_id = 'images' and public.is_admin());
