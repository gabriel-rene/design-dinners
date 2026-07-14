create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  event_type text not null default 'cena' check (event_type in ('cena','taller','otro')),
  registration_url text,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table public.speakers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title text,
  bio text,
  photo_url text,
  social_links jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.event_speakers (
  event_id uuid not null references public.events(id) on delete cascade,
  speaker_id uuid not null references public.speakers(id) on delete cascade,
  primary key (event_id, speaker_id)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create table public.admins (
  email text primary key
);

alter table public.events enable row level security;
alter table public.speakers enable row level security;
alter table public.event_speakers enable row level security;
alter table public.resources enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email')) $$;

-- public read on content tables
create policy "public read" on public.events for select using (true);
create policy "public read" on public.speakers for select using (true);
create policy "public read" on public.event_speakers for select using (true);
create policy "public read" on public.resources for select using (true);
-- admins table: RLS enabled, NO select policy → not readable by anon/authenticated.

-- admin-only writes
create policy "admin write" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.speakers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.event_speakers for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.resources for all using (public.is_admin()) with check (public.is_admin());

-- storage: public-read images bucket, admin-only write
insert into storage.buckets (id, name, public) values ('images', 'images', true);
create policy "public read images" on storage.objects for select using (bucket_id = 'images');
create policy "admin insert images" on storage.objects for insert with check (bucket_id = 'images' and public.is_admin());
create policy "admin update images" on storage.objects for update using (bucket_id = 'images' and public.is_admin());
create policy "admin delete images" on storage.objects for delete using (bucket_id = 'images' and public.is_admin());

-- table-level grants: RLS policies only take effect once the underlying role has base table
-- privileges. `anon`/`authenticated` are granted here (defaults for tables created by the
-- `postgres` role omit select/insert/update/delete); RLS above then restricts actual rows.
-- `admins` intentionally gets NO grant to anon/authenticated — stays blocked even before RLS.
grant select on public.events, public.speakers, public.event_speakers, public.resources to anon, authenticated;
grant insert, update, delete on public.events, public.speakers, public.event_speakers, public.resources to authenticated;
