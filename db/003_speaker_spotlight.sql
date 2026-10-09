-- A speaker with a spotlight label ("Speaker sorpresa") gets the headliner
-- treatment on the landing and the event page. Null = a regular speaker.
alter table speakers add column if not exists spotlight_label text
  check (spotlight_label is null or char_length(spotlight_label) between 1 and 40)
