import { expect, type Page } from "@playwright/test";

// Programmatic magic-link login against the local stack. Drives the real login
// form (so the app's own PKCE flow runs), then polls Mailpit's REST API for the
// sign-in email and follows the link — exactly how a human would, minus the
// inbox. Deterministic: the inbox is cleared first so we always read the email
// this call produced.

const MAILPIT = "http://127.0.0.1:54324";
const ADMIN_EMAIL = "admin@example.com";

/** Delete every captured message so a later poll can't read a stale link. */
export async function clearInbox(): Promise<void> {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
}

async function pollForLoginLink(timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(`to:${ADMIN_EMAIL}`);

  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${query}`);
    if (res.ok) {
      const data = (await res.json()) as { messages?: { ID: string }[] };
      const newest = data.messages?.[0];
      if (newest) {
        const msgRes = await fetch(`${MAILPIT}/api/v1/message/${newest.ID}`);
        const msg = (await msgRes.json()) as { Text?: string; HTML?: string };
        const body = `${msg.Text ?? ""}\n${msg.HTML ?? ""}`.replace(/&amp;/g, "&");
        // The GoTrue verify link (preferred) or a direct callback link.
        const match =
          body.match(/https?:\/\/[^\s)"']*\/auth\/v1\/verify\?[^\s)"']+/) ??
          body.match(/https?:\/\/[^\s)"']*\/auth\/callback\?[^\s)"']+/);
        if (match) return match[0];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`No sign-in email for ${ADMIN_EMAIL} arrived within ${timeoutMs}ms`);
}

/** Logs the seeded admin in and leaves `page` on an authenticated panel route. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await clearInbox();

  await page.goto("/admin/login");
  await page.getByLabel("Correo electrónico").fill(ADMIN_EMAIL);
  await page.getByRole("button", { name: /enviar enlace de acceso/i }).click();
  await expect(page.getByText(/revisa tu correo/i)).toBeVisible();

  const link = await pollForLoginLink();
  await page.goto(link);

  // Land inside the panel (either directly on /admin, or wherever `next` points).
  await expect(page).toHaveURL(/\/admin(?!\/login)(\/|$)/);
}
