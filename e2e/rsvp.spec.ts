import { expect, test, type Page } from "@playwright/test";

import { cleanupTestRows, createTestEvent } from "./helpers/cleanup";
import { loginAsAdmin } from "./helpers/login";

test.describe("RSVP", () => {
  test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL (run with --env-file)");

  const stamp = `E2E-RSVP-${Date.now()}`;

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    await cleanupTestRows(context, stamp);
    await context.close();
  });

  async function rsvp(page: Page, name: string, email: string) {
    await page.getByLabel("Tu nombre").fill(name);
    await page.getByLabel("Tu correo").fill(email);
    await page.getByRole("button", { name: /reservar mi puesto|unirme a la lista/i }).click();
  }

  test("validation, confirm, waitlist and duplicate", async ({ page }) => {
    const id = await createTestEvent({ stamp, title: "Cena RSVP", daysFromNow: 10, capacity: 1 });
    await page.goto(`/eventos/${id}`);
    await expect(page.getByRole("heading", { name: "Reserva tu puesto" })).toBeVisible();

    await page.getByRole("button", { name: /reservar mi puesto/i }).click();
    await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
    await expect(page.getByText("Escribe tu correo.")).toBeVisible();

    await rsvp(page, "Gabriela Ortiz", `gabriela-${stamp}@ejemplo.com`);
    const confirmedTicket = page.getByRole("region", { name: "¡Tienes puesto!" });
    await expect(confirmedTicket.getByRole("heading", { name: "¡Tienes puesto!" })).toBeVisible();
    await expect(confirmedTicket.getByText("1 de 1")).toBeVisible();

    await page.goto(`/eventos/${id}`);
    await expect(page.getByRole("heading", { name: "La mesa está llena" })).toBeVisible();
    await rsvp(page, "Diego Torres", `diego-${stamp}@ejemplo.com`);
    const waitlistTicket = page.getByRole("region", { name: "Estás en la fila" });
    await expect(waitlistTicket.getByRole("heading", { name: "Estás en la fila" })).toBeVisible();
    await expect(waitlistTicket.getByText("#1")).toBeVisible();

    await page.goto(`/eventos/${id}`);
    await rsvp(page, "Diego otra vez", `DIEGO-${stamp}@ejemplo.com`);
    await expect(page.getByRole("heading", { name: "¡Anotado!" })).toBeVisible();
  });

  test("past and external events show no form", async ({ page }) => {
    const pastId = await createTestEvent({ stamp, title: "Cena pasada", daysFromNow: -10, capacity: 10 });
    await page.goto(`/eventos/${pastId}`);
    await expect(page.getByRole("heading", { name: "Este evento ya pasó" })).toBeVisible();
    await expect(page.getByLabel("Tu nombre")).toHaveCount(0);

    const extId = await createTestEvent({
      stamp,
      title: "Cena externa",
      daysFromNow: 10,
      capacity: null,
      registrationUrl: "https://example.com/rsvp",
    });
    await page.goto(`/eventos/${extId}`);
    await expect(page.getByRole("link", { name: /reservar mi puesto/i })).toHaveAttribute(
      "href",
      "https://example.com/rsvp",
    );
    await expect(page.getByLabel("Tu nombre")).toHaveCount(0);
  });

  test("unknown and malformed ids are 404", async ({ page }) => {
    const res = await page.goto("/eventos/no-existe");
    expect(res?.status()).toBe(404);

    const unknown = await page.goto("/eventos/00000000-0000-4000-8000-000000000000");
    expect(unknown?.status()).toBe(404);
  });

  test("admin promotes from the waitlist", async ({ page }) => {
    const id = await createTestEvent({ stamp, title: "Cena admin", daysFromNow: 12, capacity: 1 });
    await page.goto(`/eventos/${id}`);
    await rsvp(page, "Ana Uno", `ana-${stamp}@ejemplo.com`);
    await expect(page.getByRole("heading", { name: "¡Tienes puesto!" })).toBeVisible();
    await page.goto(`/eventos/${id}`);
    await rsvp(page, "Beto Dos", `beto-${stamp}@ejemplo.com`);
    await expect(page.getByRole("heading", { name: "Estás en la fila" })).toBeVisible();

    await loginAsAdmin(page);
    await page.goto(`/admin/eventos/${id}/reservas`);
    const confirmed = page.getByRole("region", { name: /confirmados/i });
    await confirmed.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Se liberó 1 puesto.")).toBeVisible();
    await page.getByRole("button", { name: "Subir a Beto Dos" }).click();
    await expect(confirmed.getByText("Beto Dos")).toBeVisible();
  });
});
