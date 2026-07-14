insert into public.admins (email) values ('admin@example.com');

insert into public.events (id, title, description, event_date, location, event_type, registration_url) values
 ('00000000-0000-0000-0000-000000000001','Design Dinners Vol. 9','Una cena para hablar de IA en industrias creativas.', now() + interval '21 days','San Juan, PR','cena','https://example.com/rsvp'),
 ('00000000-0000-0000-0000-000000000002','Human Centered Design','Cena y conversatorio sobre diseño centrado en las personas.', now() - interval '60 days','Santurce, PR','cena',null),
 ('00000000-0000-0000-0000-000000000003','Taller: fundamentos de desarrollo','GitHub, Supabase y Vercel dirigidos con Claude.', now() - interval '10 days','Online','taller',null);

insert into public.speakers (id, name, role_title, bio, social_links) values
 ('00000000-0000-0000-0000-00000000000a','Ana Rivera','Directora de Diseño','Lidera equipos de producto hace 10 años.','[{"label":"LinkedIn","url":"https://linkedin.com/in/example"}]'),
 ('00000000-0000-0000-0000-00000000000b','Luis Ortiz','Design Engineer','Puentes entre diseño y código.','[]');

insert into public.event_speakers (event_id, speaker_id) values
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a'),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b');

insert into public.resources (title, description, url, category) values
 ('Hoja de estilo de marca','Colores, tipografía y logos de Design Dinners.','https://example.com/style-sheet','plantillas'),
 ('Slides del taller de desarrollo','Materiales del taller GitHub + Supabase + Vercel.','https://example.com/taller','talleres');
