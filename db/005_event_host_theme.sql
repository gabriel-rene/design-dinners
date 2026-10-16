-- Host shown on past-event cards ("Hosted by …") and the month's colors
-- (taken from that month's poster) for the landing's "Próximo evento" block.
-- Null theme colors = the default Ketchup Red block.
alter table events add column if not exists host_name text
  check (host_name is null or char_length(host_name) between 1 and 80);
alter table events add column if not exists theme_bg text
  check (theme_bg is null or theme_bg ~ '^#[0-9a-fA-F]{6}$');
alter table events add column if not exists theme_ink text
  check (theme_ink is null or theme_ink ~ '^#[0-9a-fA-F]{6}$');
alter table events add column if not exists theme_accent text
  check (theme_accent is null or theme_accent ~ '^#[0-9a-fA-F]{6}$');
