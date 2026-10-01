create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  event_type text not null default 'cena'
    check (event_type in ('cena', 'taller', 'otro')),
  registration_url text,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists speakers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title text,
  bio text,
  photo_url text,
  social_links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists event_speakers (
  event_id uuid not null references events(id) on delete cascade,
  speaker_id uuid not null references speakers(id) on delete cascade,
  primary key (event_id, speaker_id)
);

create index if not exists events_event_date_idx on events(event_date);
create index if not exists speakers_name_idx on speakers(name);
create index if not exists event_speakers_speaker_id_idx
  on event_speakers(speaker_id);
