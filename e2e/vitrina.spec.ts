import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers/login";
import { FIXTURE_IMAGE, cleanupWorks, createPublishedWork, findWorkId, hasLocalSupabase } from "./helpers/vitrina";

test.describe("La Vitrina", () => {
  test.skip(!hasLocalSupabase, "needs local Supabase + SUPABASE_SERVICE_ROLE_KEY (run with --env-file)");

  const stamp = `E2E-VITRINA-${Date.now()}`;

  test.afterAll(async () => {
    await cleanupWorks(stamp);
  });

  test("submit → hidden until approved → papitas", async ({ page }) => {
    const title = `Coquí ${stamp}`;

    await page.goto("/vitrina/enviar");
    await page.getByRole("button", { name: "Enviar a revisión" }).click();
    await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
    await expect(page.getByText("Elige una imagen de tu obra.")).toBeVisible();

    await page.getByLabel("Imagen de la obra").setInputFiles(FIXTURE_IMAGE);
    await page.getByLabel("Título de la obra").fill(title);
    await page.getByLabel("Nombre", { exact: true }).fill("Ana Prueba");
    await page.getByLabel("Rol o disciplina").fill("Ilustradora");
    await page.getByLabel("Correo electrónico").fill("ana@ejemplo.com");
    await page.getByLabel("Instagram").fill("@ana.prueba");
    await page.getByLabel("¿Buscas trabajo o proyectos?").selectOption("open_to_work");
    await page.getByLabel("Esta obra es mía y autorizo que se muestre en Design Dinners.").check();
    await page.getByRole("button", { name: "Enviar a revisión" }).click();
    await expect(page.getByRole("heading", { name: "¡Gracias!" })).toBeVisible();

    const id = await findWorkId(title);
    expect(id).not.toBeNull();
    const notYet = await page.goto(`/vitrina/${id}`);
    expect(notYet?.status()).toBe(404);

    await loginAsAdmin(page);
    await page.goto("/admin/vitrina");
    const card = page.getByRole("article", { name: title });
    await expect(card.getByText("ana@ejemplo.com")).toBeVisible();
    await card.getByRole("button", { name: "Aprobar" }).click();
    await expect(card).toBeHidden();

    await page.goto(`/vitrina/${id}`);
    const slide = page.getByRole("article", { name: `${title}, por Ana Prueba` });
    await expect(slide.getByText("Disponible para trabajo")).toBeVisible();
    await expect(slide.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://www.instagram.com/ana.prueba/");

    const count = slide.getByTestId("fries-count");
    await expect(count).toHaveText("0");
    await slide.getByRole("img", { name: title }).dblclick();
    await expect(count).toHaveText("1");
    await expect(slide.getByRole("button", { name: "Quitar papitas" })).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(slide.getByTestId("fries-count")).toHaveText("1");
    await slide.getByRole("button", { name: "Quitar papitas" }).click();
    await expect(slide.getByTestId("fries-count")).toHaveText("0");
    // Giving from the rail button sends fries flying too.
    await slide.getByRole("button", { name: "Dar papitas" }).click();
    await expect(slide.getByTestId("fries-burst")).toBeAttached();
    await expect(slide.getByTestId("fries-count")).toHaveText("1");
  });

  test("desktop keys and mobile scroll move one piece at a time", async ({ page }) => {
    // 1 ms apart, so nothing else (e.g. the piece the first test published
    // seconds ago) can sort between them in the newest-first feed.
    const base = Date.now();
    const older = await createPublishedWork(`Mayor ${stamp}`, new Date(base - 1));
    const newer = await createPublishedWork(`Menor ${stamp}`, new Date(base));

    await page.goto(`/vitrina/${newer}`);
    await expect(page.getByRole("article", { name: `Menor ${stamp}, por E2E Prueba` })).toBeVisible();
    // A key pressed before hydration is lost (no listener yet), so wait for the feed.
    await page.locator("[data-keys-ready]").waitFor({ state: "attached" });
    await page.keyboard.press("ArrowDown");
    await expect(page).toHaveURL(new RegExp(`/vitrina/${older}$`));
    await page.getByRole("button", { name: "Obra anterior" }).click();
    await expect(page).toHaveURL(new RegExp(`/vitrina/${newer}$`));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/vitrina/${newer}`);
    const box = await page.getByRole("article", { name: `Menor ${stamp}, por E2E Prueba` }).boundingBox();
    expect(Math.round(box!.height)).toBe(844);
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, 844);
    await expect(page).toHaveURL(new RegExp(`/vitrina/${older}$`));
  });
});
