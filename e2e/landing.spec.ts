import { test, expect } from "@playwright/test";

test.describe("Landing page smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("document is in Spanish", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("hero section is visible with a WhatsApp CTA link", async ({ page }) => {
    const hero = page.locator("#hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toContainText(
      "El diseño se sienta a cenar",
    );
    // Asserted by accessible name only — locally the href falls back to "#"
    // since NEXT_PUBLIC_WHATSAPP_URL is unset.
    await expect(
      hero.getByRole("link", { name: /whatsapp/i }).first(),
    ).toBeVisible();
  });

  test("proximo-evento features the seeded upcoming event with an RSVP link", async ({
    page,
  }) => {
    const section = page.locator("#proximo-evento");
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("heading", { name: "Design Dinners Vol. 9" }),
    ).toBeVisible();

    const rsvpLink = section.getByRole("link", { name: /reservar mi puesto/i });
    await expect(rsvpLink).toBeVisible();
    await expect(rsvpLink).toHaveAttribute("href", "https://example.com/rsvp");
  });

  test("eventos-pasados lists both seeded past events", async ({ page }) => {
    const section = page.locator("#eventos-pasados");
    await expect(section).toBeVisible();
    await expect(
      section.getByRole("heading", { name: "Human Centered Design" }),
    ).toBeVisible();
    await expect(
      section.getByRole("heading", { name: "Taller: fundamentos de desarrollo" }),
    ).toBeVisible();
  });

  test("speakers section shows both seeded speakers as cards", async ({ page }) => {
    const section = page.locator("#speakers");
    await expect(section).toBeVisible();

    const cards = section.locator("li");
    await expect(cards).toHaveCount(2);

    await expect(section.getByRole("heading", { name: "Ana Rivera" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Luis Ortiz" })).toBeVisible();

    // Ana Rivera speaks at the upcoming event, so she carries the badge.
    const anaCard = section.locator("li", { hasText: "Ana Rivera" });
    await expect(anaCard.getByText("Próximamente")).toBeVisible();
    const luisCard = section.locator("li", { hasText: "Luis Ortiz" });
    await expect(luisCard.getByText("Próximamente")).toHaveCount(0);
  });

  test("recursos shows both seeded resource categories", async ({ page }) => {
    const section = page.locator("#recursos");
    await expect(section).toBeVisible();
    await expect(section.getByRole("heading", { name: "plantillas" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "talleres" })).toBeVisible();
  });
});
