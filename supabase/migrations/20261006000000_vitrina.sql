-- La Vitrina: community work feed (spec: docs/specs/2026-10-06-vitrina-design.md).
-- Deny by default: anon and authenticated get NO privileges on anything here.
-- The Next.js server reads and writes with the service role, after its own
-- validation, rate limits, and requireAdmin() checks.

create table if not exists public.vitrina_works (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  creator_name text not null check (char_length(creator_name) between 1 and 120),
  creator_email text not null check (char_length(creator_email) between 3 and 254),
  creator_role text not null check (char_length(creator_role) between 1 and 60),
  badge text check (badge in ('open_to_work', 'open_to_projects')),
  link_website text,
  link_instagram text,
  link_behance text,
  link_linkedin text,
  link_dribbble text,
  image_path text not null,
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  fries_count integer not null default 0 check (fries_count >= 0),
  ip_hash text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  constraint vitrina_works_has_link check (
    coalesce(link_website, link_instagram, link_behance, link_linkedin, link_dribbble) is not null
  )
);

create unique index if not exists vitrina_works_image_path_uidx on public.vitrina_works (image_path);
create index if not exists vitrina_works_feed_idx on public.vitrina_works (status, published_at desc, id desc);
create index if not exists vitrina_works_ip_idx on public.vitrina_works (ip_hash, created_at);

create table if not exists public.vitrina_fries (
  work_id uuid not null references public.vitrina_works (id) on delete cascade,
  fan_id uuid not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  primary key (work_id, fan_id)
);

create index if not exists vitrina_fries_fan_idx on public.vitrina_fries (fan_id);
create index if not exists vitrina_fries_ip_idx on public.vitrina_fries (ip_hash, created_at);

-- One row per signed upload URL handed out: rate limit + proof that a path
-- came from us before submitVitrinaWork accepts it.
create table if not exists public.vitrina_uploads (
  path text primary key,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists vitrina_uploads_ip_idx on public.vitrina_uploads (ip_hash, created_at);

alter table public.vitrina_works enable row level security;
alter table public.vitrina_fries enable row level security;
alter table public.vitrina_uploads enable row level security;

-- Published rows only, without creator_email / ip_hash.
create or replace view public.vitrina_public as
select
  id, title, description, creator_name, creator_role, badge,
  link_website, link_instagram, link_behance, link_linkedin, link_dribbble,
  image_path, image_width, image_height, fries_count, published_at
from public.vitrina_works
where status = 'published';

-- Keyset page of the feed, newest first. The limit is clamped to 1..30.
create or replace function public.list_vitrina(
  p_before_ts timestamptz default null,
  p_before_id uuid default null,
  p_only_available boolean default false,
  p_limit integer default 8
)
returns setof public.vitrina_public
language sql
stable
set search_path = public
as $$
  select v.*
  from public.vitrina_public v
  where (p_before_ts is null or (v.published_at, v.id) < (p_before_ts, p_before_id))
    and (not p_only_available or v.badge is not null)
  order by v.published_at desc, v.id desc
  limit least(greatest(p_limit, 1), 30)
$$;

-- Give (p_on) or take back one papita. Changes fries_count only when a row
-- really changed, so repeats are harmless. Returns the new count, or null
-- when the work is not published.
create or replace function public.toggle_fry(
  p_work_id uuid,
  p_fan_id uuid,
  p_ip_hash text,
  p_on boolean
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  changed integer;
  new_count integer;
begin
  if not exists (
    select 1 from public.vitrina_works where id = p_work_id and status = 'published'
  ) then
    return null;
  end if;

  if p_on then
    insert into public.vitrina_fries (work_id, fan_id, ip_hash)
    values (p_work_id, p_fan_id, p_ip_hash)
    on conflict do nothing;
    get diagnostics changed = row_count;
    if changed > 0 then
      update public.vitrina_works set fries_count = fries_count + 1
      where id = p_work_id returning fries_count into new_count;
    end if;
  else
    delete from public.vitrina_fries where work_id = p_work_id and fan_id = p_fan_id;
    get diagnostics changed = row_count;
    if changed > 0 then
      update public.vitrina_works set fries_count = greatest(fries_count - 1, 0)
      where id = p_work_id returning fries_count into new_count;
    end if;
  end if;

  if new_count is null then
    select fries_count into new_count from public.vitrina_works where id = p_work_id;
  end if;
  return new_count;
end
$$;

revoke all on public.vitrina_works, public.vitrina_fries, public.vitrina_uploads, public.vitrina_public
  from anon, authenticated;
grant all on public.vitrina_works, public.vitrina_fries, public.vitrina_uploads to service_role;
grant select on public.vitrina_public to service_role;

revoke all on function public.list_vitrina(timestamptz, uuid, boolean, integer) from public, anon, authenticated;
revoke all on function public.toggle_fry(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.list_vitrina(timestamptz, uuid, boolean, integer) to service_role;
grant execute on function public.toggle_fry(uuid, uuid, text, boolean) to service_role;

-- 4718592 bytes = 4.5 MB. Keep in sync with MAX_IMAGE_BYTES in src/lib/vitrina/validate.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vitrina-pending', 'vitrina-pending', false, 4718592, array['image/jpeg', 'image/png', 'image/webp']),
  ('vitrina', 'vitrina', true, 4718592, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- No storage.objects policies on purpose: the public bucket serves files by
-- URL without one, and every write goes through the service role.
