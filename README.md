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

## Deploy a producción

Runbook para publicar el sitio en **Supabase Cloud + Vercel** con el dominio `designdinners.com`. Los pasos van en orden: cada uno depende del anterior.

### 1. Crear el proyecto de Supabase en la nube

1. En [supabase.com](https://supabase.com) → **New project**. Elegir una región cercana, definir la contraseña de la base de datos y guardarla.
2. Anotar de **Project Settings → API**:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`.
   - key **anon / public** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - el **project ref** (el subdominio de la URL, p. ej. `abcdefgh`) para el `link` del paso 2.

   > Nunca copiar ni usar la key **`service_role`**: la app no la necesita en ningún lado.

### 2. Aplicar el esquema (migraciones)

Desde la raíz del repo, con la CLI de Supabase:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`db push` aplica `supabase/migrations/20260714000000_init.sql`: crea las tablas (`events`, `speakers`, `event_speakers`, `resources`, `admins`), las políticas RLS y el bucket público `images`.

> **No correr `supabase/seed.sql` en producción.** El seed es solo para desarrollo local: inserta el admin de prueba `admin@example.com` y contenido demo. En prod el contenido se carga desde el panel `/admin`.

### 3. Registrar el/los email(s) de admin reales

En el dashboard → **SQL Editor**, correr una fila por admin:

```sql
insert into public.admins (email) values ('tu-email-real@dominio.com');
```

Solo los emails presentes en `public.admins` pueden entrar al panel y escribir contenido. La tabla no es legible públicamente.

### 4. Configurar las redirect URLs de Auth

En el dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://designdinners.com`
- **Redirect URLs** (agregar): `https://designdinners.com/auth/callback`
  - Si se prueba desde el dominio de Vercel antes del dominio final, agregar también `https://<proyecto>.vercel.app/auth/callback`.

Sin esto, los magic links redirigen mal y el login falla.

### 5. Importar el repo en Vercel

1. En [vercel.com](https://vercel.com) → **Add New → Project** → importar `gabriel-rene/design-dinners`. Framework: Next.js (autodetectado); la raíz publicada del repo ya es el proyecto.
2. En **Environment Variables**, definir (Production y Preview):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL del paso 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key del paso 1 |
   | `NEXT_PUBLIC_SITE_URL` | `https://designdinners.com` |
   | `NEXT_PUBLIC_WHATSAPP_URL` | link de invitación al grupo de WhatsApp |

3. Deploy.

   > Las 4 variables son `NEXT_PUBLIC_*`: se exponen al cliente por diseño (la anon key es semi-pública). Ninguna key privada / service-role va en Vercel.

### 6. Fuentes Futura Condensed

Los TTF de Futura **no se commitean** (licencia web sin confirmar; repo público = redistribución). En un deploy limpio la carpeta `public/fonts/futura/` no existe y los titulares caen a **Oswald** automáticamente — el sitio se ve correcto igual. Para restaurar Futura, una vez confirmada la licencia, elegir **una** opción:

- **A — Pipeline de fuentes privado (recomendado):** mantener los `.ttf`/`.woff2` fuera del repo (Vercel Blob, un bucket privado, o un paso de build que los baje) y copiarlos a `public/fonts/futura/` durante el build. El repo sigue sin las fuentes.
- **B — Commitear tras confirmar licencia:** solo si la licencia permite redistribución en un repo público, quitar la línea `/public/fonts/futura/` de `.gitignore`, agregar los archivos y commitear.

Ver también la sección **Licencia de fuentes** más arriba.

### 7. Apuntar el dominio

1. En Vercel → **Project → Settings → Domains** → agregar `designdinners.com` (y `www.designdinners.com` si se quiere).
2. En el registrador del dominio, crear los registros DNS que Vercel indique (típicamente un `A` del ápex a la IP de Vercel y un `CNAME` de `www` a `cname.vercel-dns.com`).
3. Esperar la propagación de DNS y la emisión automática del certificado TLS.
4. Confirmar que `NEXT_PUBLIC_SITE_URL` (paso 5) y las redirect URLs de Supabase (paso 4) usan el dominio final.

### Pendientes del owner

Cosas que solo el owner puede resolver antes o durante el deploy:

- [ ] **Cuenta de Supabase** y proyecto en la nube creado (paso 1).
- [ ] **Cuenta de Vercel** conectada a GitHub (paso 5).
- [ ] **URL del grupo de WhatsApp** para `NEXT_PUBLIC_WHATSAPP_URL` (paso 5). Mientras no esté, el CTA cae a `#` (ver nota abajo).
- [ ] **Confirmar la licencia web de Futura Condensed** antes de subir las fuentes (paso 6).
- [ ] **Estado del dominio `designdinners.com`** (registrado y con acceso al DNS) para el paso 7.

> **Nota — CTA de WhatsApp (TODO diferido del landing):** en `src/app/page.tsx` el link del grupo es `process.env.NEXT_PUBLIC_WHATSAPP_URL || "#"`. Si la variable no está definida, todos los botones «Únete al WhatsApp» apuntan a `#` (no rompen, pero no llevan a ningún lado). Definir la variable en Vercel apenas exista el grupo.
