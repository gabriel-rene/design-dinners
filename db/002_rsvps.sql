alter table events add column if not exists capacity integer
  check (capacity is null or capacity > 0);

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'waitlist', 'cancelled')),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rsvps_event_email_uidx
  on rsvps (event_id, lower(email));

create index if not exists rsvps_event_status_idx
  on rsvps (event_id, status, updated_at);

create index if not exists rsvps_ip_hash_created_idx
  on rsvps (ip_hash, created_at);
