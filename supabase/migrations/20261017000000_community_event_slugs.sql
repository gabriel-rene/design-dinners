-- Community event slugs: /eventos/comunidad/<slug>. Mirrors slugify() in src/lib/slug.ts.
create extension if not exists unaccent with schema extensions;

alter table public.community_events add column if not exists slug text;

-- Mirrors uniqueSlug(): base, base-2, base-3… until free; reserved words count as taken.
-- Only rows without a slug are touched, so re-running is safe.
do $$
declare
  r record;
  b text;
  c text;
  n int;
begin
  for r in select id, title from public.community_events where slug is null order by created_at, id loop
    b := trim(both '-' from regexp_replace(lower(extensions.unaccent(r.title)), '[^a-z0-9]+', '-', 'g'));
    if length(b) > 80 then
      if substr(b, 81, 1) = '-' then b := trim(both '-' from left(b, 80));
      elsif position('-' in left(b, 80)) > 0 then b := regexp_replace(left(b, 80), '-[^-]*$', '');
      else b := left(b, 80);
      end if;
    end if;
    if b = '' then b := 'evento'; end if;
    c := b;
    n := 1;
    while c in ('enviar', 'comunidad') or exists (select 1 from public.community_events where slug = c) loop
      n := n + 1;
      c := b || '-' || n;
    end loop;
    update public.community_events set slug = c where id = r.id;
  end loop;
end $$;

create unique index if not exists community_events_slug_uidx on public.community_events (slug);
-- Stays nullable on purpose: the app deployed before this change inserts without a slug.
-- Re-run the backfill block after the new app is deployed.
alter table public.community_events alter column slug drop not null;

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
