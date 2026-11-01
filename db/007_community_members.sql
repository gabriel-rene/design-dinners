-- WhatsApp group sign-ups: the short form a visitor fills before they get the
-- invite link. One row per email, a repeat sign-up updates it.
-- `discipline` is a key from src/lib/disciplines.ts (checked in the app, so
-- the list can change without a migration). `discipline_other` holds the
-- free text when the key is "otra".
create table if not exists community_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  discipline text not null check (char_length(discipline) between 1 and 40),
  discipline_other text check (discipline_other is null or char_length(discipline_other) between 1 and 80),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists community_members_email_uidx
  on community_members (lower(email));

create index if not exists community_members_ip_hash_updated_idx
  on community_members (ip_hash, updated_at);

-- RSVPs ask the same question. Older RSVPs stay null.
alter table rsvps add column if not exists discipline text
  check (discipline is null or char_length(discipline) between 1 and 40);

alter table rsvps add column if not exists discipline_other text
  check (discipline_other is null or char_length(discipline_other) between 1 and 80);
