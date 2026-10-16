-- Otros eventos: community design events (spec: docs/specs/2026-10-14-otros-eventos-design.md).
-- Deny by default, like La Vitrina: only the service role reads or writes,
-- after the app's own validation, rate limits, and requireAdmin() checks.

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  title text not null check (char_length(title) between 1 and 100),
  starts_at timestamptz not null,
  venue text not null check (char_length(venue) between 1 and 120),
  link text not null check (char_length(link) <= 300 and link ~* '^https?://'),
  description text check (description is null or char_length(description) <= 300),
  organizer text check (organizer is null or char_length(organizer) between 1 and 120),
  price text check (price in ('free', 'paid')),
  submitter_email text not null check (char_length(submitter_email) between 3 and 254),
  image_path text not null,
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  ip_hash text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  constraint community_events_published_at check (status <> 'published' or published_at is not null)
);

create unique index if not exists community_events_image_path_uidx on public.community_events (image_path);
create index if not exists community_events_list_idx on public.community_events (status, starts_at);
create index if not exists community_events_ip_idx on public.community_events (ip_hash, created_at);

create table if not exists public.community_event_uploads (
  path text primary key,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists community_event_uploads_ip_idx on public.community_event_uploads (ip_hash, created_at);

alter table public.community_events enable row level security;
alter table public.community_event_uploads enable row level security;

-- Published events whose Puerto Rico day has not ended. No private columns.
create or replace view public.community_events_public
with (security_invoker = true) as
select id, title, starts_at, venue, link, description, organizer, price,
       image_path, image_width, image_height, published_at
from public.community_events
where status = 'published'
  and (starts_at at time zone 'America/Puerto_Rico')::date
      >= (now() at time zone 'America/Puerto_Rico')::date;

revoke all on public.community_events, public.community_event_uploads, public.community_events_public
  from anon, authenticated;
grant all on public.community_events, public.community_event_uploads to service_role;
grant select on public.community_events_public to service_role;

-- 4718592 bytes = 4.5 MB. Keep in sync with MAX_IMAGE_BYTES in src/lib/storage/image-rules.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('otros-eventos-pending', 'otros-eventos-pending', false, 4718592, array['image/jpeg', 'image/png', 'image/webp']),
  ('otros-eventos', 'otros-eventos', true, 4718592, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
