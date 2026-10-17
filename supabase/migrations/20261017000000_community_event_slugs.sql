-- Community event slugs: /eventos/comunidad/<slug>. Mirrors slugify() in src/lib/slug.ts.
create extension if not exists unaccent with schema extensions;

alter table public.community_events add column if not exists slug text;

with base as (
  select id, created_at,
    coalesce(nullif(
      case
        when length(b) > 80 then
          case
            when substr(b, 81, 1) = '-' then trim(both '-' from left(b, 80))
            when position('-' in left(b, 80)) > 0 then regexp_replace(left(b, 80), '-[^-]*$', '')
            else left(b, 80)
          end
        else b
      end, ''), 'evento') as base
  from (
    select id, created_at,
      trim(both '-' from regexp_replace(lower(extensions.unaccent(title)), '[^a-z0-9]+', '-', 'g')) as b
    from public.community_events
    where slug is null
  ) s
),
ranked as (
  select id, base,
    row_number() over (partition by base order by created_at, id)
      + case when base in ('enviar', 'comunidad') then 1 else 0 end as n
  from base
)
update public.community_events e
set slug = case when r.n = 1 then r.base else r.base || '-' || r.n end
from ranked r
where e.id = r.id;

create unique index if not exists community_events_slug_uidx on public.community_events (slug);
alter table public.community_events alter column slug set not null;

create or replace view public.community_events_public
with (security_invoker = true) as
select id, title, starts_at, venue, link, description, organizer, price,
       image_path, image_width, image_height, published_at, slug
from public.community_events
where status = 'published'
  and (starts_at at time zone 'America/Puerto_Rico')::date
      >= (now() at time zone 'America/Puerto_Rico')::date;

revoke all on public.community_events, public.community_events_public from anon, authenticated;
grant all on public.community_events to service_role;
grant select on public.community_events_public to service_role;
