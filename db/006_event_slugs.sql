-- Readable event URLs: /eventos/<slug>. Slug is nullable on purpose (code
-- deployed before this migration keeps inserting events without one and links
-- fall back to the id). old_slugs keeps previous slugs so renamed events still
-- redirect. Backfill mirrors src/lib/slug.ts: unaccent, non [a-z0-9] runs to
-- "-", trim, cut to 80, empty -> "evento", reserved words get "-2", duplicates
-- get "-n" by created_at. Every statement is idempotent (the runner re-runs it).
create extension if not exists unaccent;
alter table events add column if not exists slug text;
alter table events add column if not exists old_slugs text[] not null default '{}';
update events e set slug = s.slug
from (
  select
    id,
    case when row_number() over (partition by base order by created_at, id) > 1
      then base || '-' || row_number() over (partition by base order by created_at, id)
      else base
    end as slug
  from (
    select
      id,
      created_at,
      case when b in ('enviar', 'comunidad') then b || '-2' else b end as base
    from (
      select
        id,
        created_at,
        coalesce(
          nullif(
            regexp_replace(
              left(
                regexp_replace(
                  regexp_replace(lower(unaccent(title)), '[^a-z0-9]+', '-', 'g'),
                  '^-+|-+$', '', 'g'
                ),
                80
              ),
              '-+$', '', 'g'
            ),
            ''
          ),
          'evento'
        ) as b
      from events
      where slug is null
    ) t
  ) u
) s
where e.id = s.id and e.slug is null;
create unique index if not exists events_slug_uidx on events (slug);
create index if not exists events_old_slugs_idx on events using gin (old_slugs);
