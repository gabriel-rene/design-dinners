-- Per-RSVP secret for the "liberar mi puesto" link, and once-only reminder marks.
alter table rsvps add column if not exists cancel_token uuid not null default gen_random_uuid();
create unique index if not exists rsvps_cancel_token_uidx on rsvps (cancel_token);
alter table rsvps add column if not exists reminder_sent_at timestamptz;
alter table rsvps add column if not exists final_reminder_sent_at timestamptz;
