import { test, expect } from "@playwright/test";

test.describe("Admin auth gate", () => {
  test("anonymous visitor is redirected from /admin to /admin/login", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
      page.getByRole("heading", { name: "Panel de administración" }),
    ).toBeVisible();

    const emailInput = page.getByLabel("Correo electrónico");
    await expect(emailInput).toBeVisible();
    await expect(
      page.getByRole("button", { name: /enviar enlace de acceso/i }),
    ).toBeVisible();
  });

  test("anonymous visitor can reach /admin/login directly without a redirect loop", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  });

  test("auth callback never redirects off-origin via the next param", async ({
    page,
  }) => {
    // `next=.evil.com` unvalidated would yield `${origin}.evil.com` — an
    // attacker-controlled host. Whatever the code-exchange outcome, every
    // redirect in the chain must stay on localhost:3000.
    const offOrigin: string[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest()) {
        const url = new URL(request.url());
        if (url.host !== "localhost:3000") {
          offOrigin.push(request.url());
        }
      }
    });

    await page.goto("/auth/callback?code=not-a-real-code&next=.evil.com");

    expect(offOrigin).toEqual([]);
    // Invalid code → error path → login page, still on-origin.
    await expect(page).toHaveURL(/localhost:3000\/admin\/login/);
  });
});
