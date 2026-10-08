# RSVPs in Google Sheets

A Google Sheet that shows every RSVP (event, name, email, status).
It updates itself twice a day (every 12 hours).

## How it works

- The site has a private feed: `GET /api/rsvps/export`.
- The feed needs the header `Authorization: Bearer <RSVP_EXPORT_TOKEN>`.
- Without `RSVP_EXPORT_TOKEN` on Vercel, the feed answers 404 (off).
- A Google Apps Script in the sheet reads the feed every 12 hours.
  It rewrites the **Reservas** tab. Cancelled and waitlist rows show their status.

## Setup (one time, about 3 minutes)

1. Open the sheet. Click **Extensions → Apps Script**.
2. Delete the sample code. Paste all of `docs/google-sheets/rsvp-sync.gs`. Click **Save**.
3. Click the gear (**Project Settings**). Scroll to **Script Properties**.
   Add property `RSVP_EXPORT_TOKEN`. Paste the token as the value. Save.
   (Get the token from Vercel: project → Settings → Environment Variables, or ask Gabriel.)
4. Back in the editor, pick the function **setup** at the top. Click **Run**.
5. Google asks for permission. Click **Review permissions → your account → Advanced → Go to project → Allow**.
   (The script is yours, so Google shows the "unverified app" screen. This is normal.)
6. Open the sheet. The **Reservas** tab is there.

## Rules

- Do not type in the **Reservas** tab. Each sync rewrites it.
  To add notes, use another tab.
- To give the organizer access: **Share** the sheet with their email as **Viewer**.
- To rotate the token: make a new one (`openssl rand -hex 32`), update it on Vercel,
  redeploy, then update the Script Property.
