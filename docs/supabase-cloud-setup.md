# Design Dinners — set up Supabase (admin login and images)

The website uses **Supabase** for two things:

- The **admin login** (you get a link by email, no password).
- The **images** (event covers and speaker photos).

Events, speakers and RSVPs live somewhere else (Neon). You do not need to touch that here.

This takes about 20 minutes. It is free. Do the steps in order.

## What you need

- Your email address (the one you will use to log in as admin).
- Access to **Vercel** (project **design-dinners**).
- The file `supabase/migrations/20260714000000_init.sql` from the site repo. Gabriel can send it to you.

## Steps

1. **Make the Supabase project**
   - Go to https://supabase.com and sign in (or sign up).
   - Click **New project**.
   - Name: `design-dinners`.
   - Region: **East US (North Virginia)**.
   - Choose a database password and save it in your password manager. You will not need it again for this guide.
   - Click **Create new project**. Wait 1 or 2 minutes.

2. **Create the tables and the image folder**
   - In the left menu, click **SQL Editor**.
   - Click **New query**.
   - Open the file `supabase/migrations/20260714000000_init.sql`. Copy all of it.
   - Paste it in the editor.
   - Click **Run**.
   - You should see **Success. No rows returned**.

3. **Add yourself as an admin**
   - Stay in **SQL Editor**. Click **New query**.
   - Paste this. Replace `tu-correo@ejemplo.com` with your email, and keep the quotes:

     ```sql
     insert into public.admins (email) values ('tu-correo@ejemplo.com');
     ```

   - Click **Run**.
   - To add another admin later, run the same line with their email.

4. **Tell Supabase which website addresses are allowed**
   - In the left menu, click **Authentication**.
   - Click **URL Configuration**.
   - **Site URL**: `https://design-dinners.vercel.app`
   - Under **Redirect URLs**, click **Add URL** and add these 2, one at a time:
     - `https://design-dinners.vercel.app/auth/callback`
     - `https://designdinners.com/auth/callback`
   - Click **Save changes**.

5. **Copy 2 values from Supabase**
   - In the left menu, click **Project Settings** (the gear), then **API**.
   - Copy **Project URL**. It looks like `https://abcdxyz.supabase.co`.
   - Copy the **anon** key (it may be called **publishable** key). It is a long text.
   - Keep both open. You paste them in the next step.

6. **Put the values in Vercel**
   - Go to https://vercel.com → project **design-dinners** → **Settings** → **Environment Variables**.
   - Add each variable below. For each one, tick **Production** and **Preview**, then click **Save**.

     | Name                            | Value                                                      |
     |---------------------------------|------------------------------------------------------------|
     | `NEXT_PUBLIC_SUPABASE_URL`      | the **Project URL** from step 5                            |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **anon / publishable** key from step 5                 |
     | `NEXT_PUBLIC_SITE_URL`          | `https://design-dinners.vercel.app`                        |
     | `RSVP_IP_SALT`                  | a random secret (see below)                                |
     | `NEXT_PUBLIC_WHATSAPP_URL`      | the WhatsApp group invite link (only if it is not there)   |

   - **How to make `RSVP_IP_SALT`:** open Terminal and run `openssl rand -hex 32`. Copy the long text it prints and paste it as the value. Do not share it and do not put it in any file.
   - If a variable already exists, leave it as it is.
   - When the website gets its own domain, change `NEXT_PUBLIC_SITE_URL` to `https://designdinners.com` and redeploy.

7. **Redeploy**
   - In Vercel, go to **Deployments**.
   - Click the 3 dots next to the latest deployment → **Redeploy**.
   - Wait until it says **Ready**.

8. **Test the login**
   - Open https://design-dinners.vercel.app/admin/login
   - Type the email from step 3. Send the link.
   - Open your email. Click the link.
   - You should land in the admin panel.

## If something goes wrong

- **The email does not arrive.** Wait 2 minutes and check spam. Supabase's free email only allows a few login emails per hour. This is fine for 1 to 3 admins. If you hit the limit, wait an hour and try again.
- **The link opens an error page.** Check step 4. The addresses must match exactly, with no extra `/` at the end.
- **You see "Acceso no autorizado".** Your email is not in the admin list. Check step 3. Use the same email you typed on the login page.
- **Images do not upload.** Check step 2 ran without errors. Check that you are logged in as an admin.

## Antes de publicar las reservas

Before the RSVP feature goes live, one small database update is needed. This is a different database from Supabase. It is the **Neon** one.

The update only **adds** things. Nothing is deleted or changed, so it is safe for the live site.

1. Go to Vercel → project **design-dinners** → **Storage** → **Neon**.
2. Find which Neon **branch** the **Production** environment uses. Write down the name.
3. Ask Gabriel to run `npm run db:migrate` against that branch. (It is one command. Gabriel needs the connection string of that branch.)
4. Check that `RSVP_IP_SALT` is set in Vercel (step 6) for **Production**.
5. Only then tell Gabriel it is OK to merge. Merging puts the RSVP feature on the live site.

Questions? Contact Gabriel.
