# Diseño — Sitio web de Design Dinners (landing + admin)

**Fecha:** 2026-07-14
**Estado:** Diseño aprobado, pendiente de plan de implementación

---

## 1. Objetivo

Sitio público para la comunidad Design Dinners: presentar la comunidad, mostrar eventos pasados y próximos, speakers y recursos, y dirigir a la gente al grupo de WhatsApp. Incluye un dashboard de administración para que los organizadores gestionen eventos, speakers y recursos sin tocar código.

**Criterio de éxito:** un organizador puede publicar un evento nuevo desde `/admin` y verlo en la landing inmediatamente; un visitante entiende qué es Design Dinners y cómo unirse en menos de 30 segundos.

---

## 2. Decisiones fijadas

| Decisión | Elección |
|---|---|
| Stack | Next.js (App Router, TypeScript) + Supabase + Vercel |
| Auth de admin | Supabase Auth magic link + tabla allowlist de emails |
| Registro a eventos | URL externa por evento (Luma/Eventbrite/WhatsApp/form) |
| Recursos | Links curados: título, descripción, URL, categoría |
| Idioma del sitio | Español |
| Repo | Nuevo repo git en `site/`, publicado como **repo público** `gabriel-rene/design-dinners` en GitHub |
| Calidad de diseño | Skill `impeccable` (pbakaus) como guía de ejecución visual/UX |
| Orquestación | Fable orquesta; subagentes Sonnet/Opus ejecutan la implementación |

---

## 3. Arquitectura

Una sola app Next.js desplegada en Vercel:

- **Landing pública** (`/`): server-rendered con revalidación on-demand (`revalidatePath` disparado desde las mutaciones del admin), de modo que los cambios del admin aparecen de inmediato sin rebuild.
- **Admin** (`/admin/*`): protegido por middleware. Sesión de Supabase Auth (magic link) + verificación contra la tabla `admins`. Usuario sin sesión → redirect a `/admin/login`; usuario con sesión pero fuera del allowlist → pantalla de "no autorizado" con opción de cerrar sesión.
- **Datos:** Supabase Postgres con Row Level Security — lectura pública (`select` para `anon`), escritura solo para admins allowlisted (política que consulta `admins` por el email del JWT).
- **Imágenes:** bucket público de Supabase Storage (`images/`) para covers de eventos y fotos de speakers. Subida desde el admin.
- **Mutaciones:** Server Actions de Next.js (no API routes separadas). Cada action re-verifica la sesión y el allowlist en el servidor — el middleware es UX, la RLS y la verificación en la action son la seguridad real.

---

## 4. Modelo de datos

```sql
events (
  id uuid pk default gen_random_uuid(),
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  event_type text not null check (event_type in ('cena','taller','otro')),
  registration_url text,
  cover_image_url text,
  created_at timestamptz default now()
)

speakers (
  id uuid pk default gen_random_uuid(),
  name text not null,
  role_title text,          -- p. ej. "Directora de Diseño, Acme"
  bio text,
  photo_url text,
  social_links jsonb default '[]',  -- [{label, url}]
  created_at timestamptz default now()
)

event_speakers (
  event_id uuid references events on delete cascade,
  speaker_id uuid references speakers on delete cascade,
  primary key (event_id, speaker_id)
)

resources (
  id uuid pk default gen_random_uuid(),
  title text not null,
  description text,
  url text not null,
  category text not null,   -- talleres, plantillas, lecturas, herramientas…
  created_at timestamptz default now()
)

admins (
  email text pk
)
```

Reglas derivadas (nunca almacenadas):

- **Evento pasado vs próximo:** `event_date` vs `now()`.
- **Speaker "próximamente":** speaker vinculado solo a eventos futuros, o sin eventos.
- **Categorías de recursos:** texto libre normalizado en el admin (input con sugerencias de categorías existentes), no un enum — evita migraciones por categoría nueva.

RLS: `select` público en `events`, `speakers`, `event_speakers`, `resources`; `insert/update/delete` solo si `auth.jwt()->>'email'` existe en `admins`. La tabla `admins` no es legible públicamente.

---

## 5. Landing page (una página, scroll en español)

1. **Hero** — logo con mascota, identidad "Delicious Collective", una línea de qué es la comunidad, CTA primario "Únete al WhatsApp".
2. **Próximo evento** — el evento futuro más cercano, destacado en grande: cover, fecha, lugar, tipo, botón a su `registration_url`. Si hay más eventos futuros, aparecen como cards secundarias. Estado vacío: "Estamos cocinando la próxima cena" + CTA WhatsApp.
3. **Eventos pasados** — grid/archivo con cover, título, fecha, speakers asociados.
4. **Speakers** — grid con foto, nombre, rol, links sociales.
5. **Recursos** — agrupados por categoría; cada uno con título, descripción y link externo.
6. **Sobre / footer** — texto breve de la comunidad, logo, CTA WhatsApp de nuevo, crédito de marca.

**Ejecución de marca** (de la hoja de estilo, marzo 2024):

- Colores: fondo Mayo Cream `#F8E3CA`, Ketchup Red `#D21432` como color principal, Papita Yellow `#FAA61A` y Patty Brown `#964220` como acentos, Burnt Black `#000000` para texto, Blue Double Checkmark `#1687FF` solo como detalle puntual.
- Tipografía: Futura Condensed ExtraBold para titulares (mayúsculas, condensada, grande), Futura Condensed Medium para subtítulos, Inter para cuerpo. Fuentes convertidas a woff2 y self-hosted desde los TTF/OTF del brand kit. **Pendiente del dueño del proyecto: confirmar licencia web de Futura Condensed.**
- Nada de sombras ni strokes sobre el logo (regla explícita de la hoja de estilo). Tintes bajo 60% requieren texto oscuro.
- Fotos del brand kit como imágenes de relleno inicial donde falten covers.

Responsive completo; el sitio se verá sobre todo en móvil (llega por WhatsApp).

---

## 6. Admin dashboard (`/admin`)

- **Login** (`/admin/login`): input de email → magic link → callback → sesión.
- **Tres secciones:** Eventos, Speakers, Recursos. Cada una: lista (ordenada por fecha/nombre) con crear / editar / borrar.
- **Formulario de evento:** título, descripción, fecha y hora, lugar, tipo, URL de registro, cover (upload a Storage), selección múltiple de speakers.
- **Formulario de speaker:** nombre, rol, bio, foto (upload), links sociales (pares label+URL repetibles).
- **Formulario de recurso:** título, descripción, URL, categoría (con sugerencias).
- Borrar pide confirmación. Borrar un evento no borra sus speakers (solo el vínculo, por el cascade del join).
- Estética: con marca pero utilitario — sin gráficas ni métricas.

---

## 6b. Seguridad y secretos (repo público)

El repo es público, así que la higiene de secretos es obligatoria, no opcional:

- `.env*` en `.gitignore` desde el commit inicial; solo se versiona `.env.example` con placeholders.
- Nunca se commitea `SUPABASE_SERVICE_ROLE_KEY` ni ninguna key real. La `anon key` de Supabase es semi-pública por diseño, pero igualmente vive en env vars, no en el código.
- La seguridad de escritura depende de RLS + verificación de allowlist en Server Actions — nunca de ocultar el código (el código es público).
- La tabla `admins` sin lectura pública; los emails de admins no aparecen en el repo.
- Revisión pre-push de cada commit inicial en busca de secretos (grep de patrones de keys) antes de publicar el repo.
- Storage: bucket de imágenes con escritura restringida a admins vía policies; lectura pública solo del bucket de imágenes.

## 7. Manejo de errores y estados vacíos

- Landing: secciones sin datos muestran estado vacío diseñado (no desaparecen en silencio salvo Recursos/Speakers, que sí se ocultan si están completamente vacíos; "Próximo evento" siempre visible con su estado vacío).
- Imágenes: fallback a un placeholder de marca (patrón/color) si falta cover o foto.
- Admin: errores de validación inline en el formulario; errores de Supabase se muestran como mensaje, nunca fallan en silencio.
- Middleware/actions: fallo de auth → redirect o 403, nunca escritura parcial.

---

## 8. Testing y verificación

- **Unit:** lógica derivada (pasado/próximo, speaker "próximamente", agrupación de recursos por categoría) y helper de allowlist.
- **Smoke (Playwright):** la landing renderiza todas las secciones con datos seed; `/admin` redirige sin sesión; un email fuera del allowlist ve "no autorizado".
- **Verificación manual antes de deploy:** flujo completo en local contra Supabase real — crear evento con imagen en el admin y verlo en la landing.

---

## 9. Fuera de alcance (YAGNI)

- RSVP propio / gestión de asistentes
- Multi-idioma
- Páginas de detalle por evento/speaker (todo vive en la landing; se puede añadir después)
- Newsletter, blog, analytics dashboard
- Roles de admin diferenciados

---

## 10. Dependencias externas (requieren al dueño)

1. **Proyecto Supabase** — crear proyecto y obtener URL + keys (o autorizar CLI).
2. **Proyecto Vercel** — vincular repo y variables de entorno.
3. **Dominio** — confirmar estado de `designdinners.com` y apuntarlo a Vercel.
4. **Licencia web de Futura Condensed** — confirmar antes del launch público.
5. **URL del grupo de WhatsApp** — para los CTAs.
