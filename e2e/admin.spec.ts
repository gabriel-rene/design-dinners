import { test, expect } from "@playwright/test";

import { cleanupTestRows } from "./helpers/cleanup";
import { loginAsAdmin } from "./helpers/login";

// One authenticated session drives the whole smoke flow. Magic-link login is
// expensive (and rate-limited), so this is a single serial test with labeled
// steps rather than many independent tests each logging in.
test.describe("Admin CRUD smoke", () => {
  test("admin creates content that reaches the landing, and delete keeps speakers", async ({
    page,
  }) => {
    // Native confirm() on every delete → always accept.
    page.on("dialog", (dialog) => dialog.accept());

    const stamp = Date.now();
    const eventTitle = `E2E Cena ${stamp}`;
    const editedTitle = `${eventTitle} (editado)`;
    const speakerName = `E2E Speaker ${stamp}`;
    const resourceTitle = `E2E Recurso ${stamp}`;

    // The shared local Supabase DB is mutable global state and the landing spec
    // asserts exact seeded counts, so restoring the baseline must survive ANY
    // assertion failure above it — hence try/finally around the whole flow, with
    // a REST-level cleanup keyed on `stamp` (see helpers/cleanup.ts) that works
    // even when the UI is the thing that broke.
    try {
      await test.step("log in via magic link", async () => {
        await loginAsAdmin(page);
      });

      await test.step("create an event with a speaker attached", async () => {
        await page.goto("/admin/eventos/nuevo");
        await page.getByLabel("Título").fill(eventTitle);
        await page.getByLabel("Fecha y hora").fill("2027-03-15T19:00");
        // Ana Rivera is seeded; attach her so the delete-keeps-speaker check is real.
        await page.getByRole("checkbox", { name: "Ana Rivera" }).check();
        await page.getByRole("button", { name: "Crear evento" }).click();

        await expect(page).toHaveURL(/\/admin\/eventos$/);
        await expect(
          page.getByRole("heading", { name: eventTitle }),
        ).toBeVisible();
      });

      await test.step("new event appears on the public landing without a rebuild", async () => {
        await page.goto("/");
        await expect(page.getByText(eventTitle).first()).toBeVisible();
      });

      await test.step("edit the event", async () => {
        await page.goto("/admin/eventos");
        await page
          .getByRole("listitem")
          .filter({ hasText: eventTitle })
          .getByRole("link", { name: "Editar" })
          .click();
        await expect(page).toHaveURL(/\/admin\/eventos\/[0-9a-f-]+$/);

        const titleInput = page.getByLabel("Título");
        await expect(titleInput).toHaveValue(eventTitle);
        await titleInput.fill(editedTitle);
        await page.getByRole("button", { name: "Guardar cambios" }).click();

        await expect(page).toHaveURL(/\/admin\/eventos$/);
        await expect(page.getByRole("heading", { name: editedTitle })).toBeVisible();
      });

      await test.step("create a speaker", async () => {
        await page.goto("/admin/speakers/nuevo");
        await page.getByLabel("Nombre").fill(speakerName);
        await page.getByLabel("Cargo o rol").fill("Design Engineer");
        await page.getByLabel("Etiqueta del enlace").fill("LinkedIn");
        await page.getByLabel("URL del enlace").fill("https://linkedin.com/in/e2e");
        await page.getByRole("button", { name: "Crear speaker" }).click();

        await expect(page).toHaveURL(/\/admin\/speakers$/);
        await expect(page.getByRole("heading", { name: speakerName })).toBeVisible();
      });

      await test.step("create a resource", async () => {
        await page.goto("/admin/recursos/nuevo");
        await page.getByLabel("Título").fill(resourceTitle);
        await page.getByLabel(/^Enlace/).fill("https://example.com/e2e");
        await page.getByLabel("Categoría").fill("e2e");
        await page.getByRole("button", { name: "Crear recurso" }).click();

        await expect(page).toHaveURL(/\/admin\/recursos$/);
        await expect(page.getByText(resourceTitle)).toBeVisible();
      });

      await test.step("delete the event without deleting its speaker", async () => {
        await page.goto("/admin/eventos");
        await page
          .getByRole("listitem")
          .filter({ hasText: editedTitle })
          .getByRole("button", { name: "Eliminar" })
          .click();

        await expect(page).toHaveURL(/\/admin\/eventos$/);
        await expect(page.getByRole("heading", { name: editedTitle })).toHaveCount(0);

        // The attached seeded speaker (Ana Rivera) and the one we created both survive.
        await page.goto("/admin/speakers");
        await expect(page.getByRole("heading", { name: "Ana Rivera" })).toBeVisible();
        await expect(page.getByRole("heading", { name: speakerName })).toBeVisible();
      });

      // Happy-path cleanup goes through the admin UI on purpose: the delete
      // actions call revalidatePath('/'), so the public landing is re-rendered
      // without the test rows before the landing spec asserts its exact counts
      // (the REST fallback below deletes rows but cannot revalidate the page).
      await test.step("clean up created speaker and resource via the UI", async () => {
        await page.goto("/admin/speakers");
        await page
          .getByRole("listitem")
          .filter({ hasText: speakerName })
          .getByRole("button", { name: "Eliminar" })
          .click();
        await expect(page.getByRole("heading", { name: speakerName })).toHaveCount(0);

        await page.goto("/admin/recursos");
        await page
          .getByRole("listitem")
          .filter({ hasText: resourceTitle })
          .getByRole("button", { name: "Eliminar" })
          .click();
        await expect(page.getByText(resourceTitle)).toHaveCount(0);
      });
    } finally {
      // Failure-safe net: always restore the seeded DB baseline, no matter which
      // step above blew up. Idempotent (no-op after the UI cleanup succeeded, or
      // when login never completed and nothing was created). A run that dies
      // before its revalidatePath calls can leave the statically-cached landing
      // momentarily stale, but the next admin run's first mutation re-renders it.
      await cleanupTestRows(page.context(), stamp);
    }
  });
});
