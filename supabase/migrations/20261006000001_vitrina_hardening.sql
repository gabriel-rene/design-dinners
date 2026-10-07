-- La Vitrina hardening (follows 20261006000000_vitrina.sql).
-- 1. A published row always has published_at (the feed orders and pages by it).
-- 2. Links are web links only: no javascript:, data:, mailto: etc. even if a
--    write ever bypasses the app's validation.
-- 3. vitrina_public runs with the caller's privileges, so a future grant on the
--    view can never expose vitrina_works rows the caller could not read.

alter table public.vitrina_works
  add constraint vitrina_works_published_at
    check (status <> 'published' or published_at is not null),
  add constraint vitrina_works_link_website_http
    check (link_website is null or link_website ~* '^https?://'),
  add constraint vitrina_works_link_instagram_http
    check (link_instagram is null or link_instagram ~* '^https?://'),
  add constraint vitrina_works_link_behance_http
    check (link_behance is null or link_behance ~* '^https?://'),
  add constraint vitrina_works_link_linkedin_http
    check (link_linkedin is null or link_linkedin ~* '^https?://'),
  add constraint vitrina_works_link_dribbble_http
    check (link_dribbble is null or link_dribbble ~* '^https?://');

-- Same columns and filter as before; list_vitrina depends on this row type.
create or replace view public.vitrina_public
with (security_invoker = true) as
select
  id, title, description, creator_name, creator_role, badge,
  link_website, link_instagram, link_behance, link_linkedin, link_dribbble,
  image_path, image_width, image_height, fries_count, published_at
from public.vitrina_works
where status = 'published';

revoke all on public.vitrina_public from anon, authenticated;
grant select on public.vitrina_public to service_role;
