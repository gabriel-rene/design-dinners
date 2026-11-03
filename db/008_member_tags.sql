-- Admin-only labels on community members ("comite", "organizador", ...).
-- Keys are lowercase slugs, checked in the app (src/lib/member-tags.ts), so
-- the set can grow without a migration. Sign-ups start with no tags.
alter table community_members add column if not exists tags text[] not null default '{}';

create index if not exists community_members_tags_idx
  on community_members using gin (tags);
