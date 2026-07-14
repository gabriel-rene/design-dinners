# Design Dinners — Sitio de la comunidad

Sitio web de la comunidad **Design Dinners** (Delicious Collective): landing page pública con próximos y pasados eventos, speakers y recursos, más un panel de administración protegido para gestionar el contenido. Construido con Next.js (App Router) y Supabase (Postgres, Auth, Storage).

Ver `docs/spec.md` (especificación de diseño) y `docs/plan.md` (plan de implementación) para el detalle completo del proyecto.

## Setup local

Requisitos: Node 22, npm, Docker (para Supabase local).

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Levantar Supabase local (requiere Docker corriendo):

   ```bash
   npx supabase start
   ```

   Este comando imprime la `API URL` y la `anon key` locales.

3. Copiar el archivo de entorno de ejemplo y completarlo con los valores anteriores:

   ```bash
   cp .env.example .env.local
   ```

   Editar `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` → `API URL` de `supabase start` (por defecto `http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `anon key` de `supabase start`
   - `NEXT_PUBLIC_SITE_URL` → URL del sitio, usada en los redirects de magic link (por defecto `http://localhost:3000`)

4. Correr el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

## Licencia de fuentes (Futura Condensed)

La tipografía de titulares del diseño es Futura Condensed (ExtraBold/Medium), pero su licencia de uso web para este repo público **no está confirmada**. Por eso los archivos TTF/woff2 de Futura **no se commitean**: la carpeta `public/fonts/futura/` está en `.gitignore`. Los estilos usan un fallback a **Oswald** (Google Font, self-hosted) mientras se confirma la licencia. Inter (fuente de cuerpo) se carga vía `next/font/google` y no tiene este problema.

Para restaurar Futura en un entorno con la licencia confirmada:

1. Convertir los TTF/OTF del brand kit a `.woff2`.
2. Copiarlos a `public/fonts/futura/` (la carpeta ya está gitignoreada, así que no se subirán por accidente).
3. Ajustar la config de `next/font/local` o el CSS que referencia Futura para apuntar a esos archivos.

## Modelo de seguridad

- **Lectura pública:** Row Level Security (RLS) en Supabase Postgres permite `select` público (rol `anon`) sobre las tablas de contenido (`events`, `speakers`, `event_speakers`, `resources`).
- **Escritura restringida:** `insert`/`update`/`delete` solo están permitidos si el email del JWT autenticado existe en la tabla `admins` (allowlist). La tabla `admins` no es legible públicamente.
- **Doble verificación:** el middleware de `/admin/*` es solo UX (redirige sin sesión o sin allowlist a una pantalla de "no autorizado"). La seguridad real vive en las políticas RLS y en la re-verificación de sesión + allowlist dentro de cada Server Action.
- **Anon key pública por diseño:** la `NEXT_PUBLIC_SUPABASE_ANON_KEY` es semi-pública (se expone al cliente) por diseño de Supabase, pero igual vive en variables de entorno, nunca hardcodeada en el código.
- **Sin service role en la app:** `SUPABASE_SERVICE_ROLE_KEY` (o cualquier key con privilegios de administrador) nunca se usa en el código de la aplicación ni se commitea. Todo archivo `.env*` real está gitignoreado desde el commit inicial; solo `.env.example` (sin valores reales) se versiona.
