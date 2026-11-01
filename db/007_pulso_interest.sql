-- Pulso del Diseño PR: people who want to help with the study (advisors,
-- academia, sponsors, outreach, volunteers, or just to answer the survey).
-- Written only by the /pulso server action. ip_hash is the salted hash used
-- for the daily rate limit, never the raw IP. Every statement is idempotent
-- (the runner re-runs every file).
create table if not exists pulso_interest (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  organization text check (char_length(organization) <= 160),
  roles text[] not null check (cardinality(roles) between 1 and 6),
  message text check (char_length(message) <= 2000),
  lang text not null default 'es' check (lang in ('es', 'en')),
  ip_hash text
);
create index if not exists pulso_interest_ip_created_idx on pulso_interest (ip_hash, created_at);
