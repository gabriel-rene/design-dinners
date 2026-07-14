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
});
