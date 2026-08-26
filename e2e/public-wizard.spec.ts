import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const FIXTURE_PNG = path.join(__dirname, "fixtures", "office-floor.png");

/** Minimal valid 100x100 PNG for floor-plan tests. */
function createTestPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAA/klEQVR42u3RAQ0AAAgDINc/9K3hYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPBrBqoAAfR7o0AAAAAASUVORK5CYII=",
    "base64",
  );
}

test.beforeAll(() => {
  const dir = path.join(__dirname, "fixtures");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FIXTURE_PNG, createTestPng());
});

async function advanceRoom(page: import("@playwright/test").Page) {
  await page.goto("/wizard");
  await expect(page.getByText("Wat voor ruimte wilt u verlichten?")).toBeVisible();
  await page.getByRole("button", { name: "Open kantoor" }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
}

async function advanceAtmosphere(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Neutraal kantoor" }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
}

async function setupFloorPlan(page: import("@playwright/test").Page) {
  await page.setInputFiles('input[type="file"]', FIXTURE_PNG);
  await page.getByRole("button", { name: "Schaal instellen" }).click();
  const stage = page.locator("canvas").first();
  await expect(stage).toBeVisible();
  const box = await stage.boundingBox();
  if (!box) throw new Error("Stage not found");
  await stage.click({ position: { x: box.width * 0.3, y: box.height * 0.5 } });
  await stage.click({ position: { x: box.width * 0.7, y: box.height * 0.5 } });
  await page.getByPlaceholder("Afstand in mm").fill("5000");
  await page.getByRole("button", { name: "Schaal toepassen" }).click();
  await page.getByRole("button", { name: "Ruimte tekenen" }).click();
  await stage.click({ position: { x: box.width * 0.15, y: box.height * 0.15 } });
  await stage.click({ position: { x: box.width * 0.85, y: box.height * 0.15 } });
  await stage.click({ position: { x: box.width * 0.85, y: box.height * 0.85 } });
  await stage.click({ position: { x: box.width * 0.15, y: box.height * 0.85 } });
  await page.getByRole("button", { name: "Ruimte afronden" }).click();
  await page.getByRole("button", { name: "Volgende" }).click();
}

async function generateAndOpenResult(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Genereer mijn lichtplan" }).click();
  await expect(page.getByRole("button", { name: "Bekijk lichtverdeling" })).toBeVisible();
  await expect(page.getByTestId("wizard-next-button")).toBeEnabled();
  await page.getByTestId("wizard-next-button").click();
  await expect(page.getByText("Indicatief resultaat")).toBeVisible();
}

test.describe("Public LED wizard", () => {
  test("room function selection", async ({ page }) => {
    await page.goto("/wizard");
    await expect(page.getByText("Wat voor ruimte wilt u verlichten?")).toBeVisible();
    await page.getByRole("button", { name: "Gang 100 lux" }).click();
    await expect(page.locator('input[type="number"]').nth(1)).toHaveValue("100");
  });

  test("atmosphere selection", async ({ page }) => {
    await advanceRoom(page);
    await expect(page.getByText("Kies de lichtsfeer")).toBeVisible();
    await page.getByRole("button", { name: "Warm kantoor" }).click();
    await page.getByRole("button", { name: "Volgende" }).click();
    await expect(page.getByText("Upload uw plattegrond")).toBeVisible();
  });

  test("floor plan upload, calibration and room drawing", async ({ page }) => {
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await setupFloorPlan(page);
    await expect(page.getByText("Genereer uw lichtplan")).toBeVisible();
  });

  test("automatic generation, manual edits, heatmap and result", async ({ page }) => {
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await setupFloorPlan(page);
    await page.getByRole("button", { name: "Genereer mijn lichtplan" }).click();
    await page.getByRole("button", { name: "Downlight toevoegen" }).click();
    const stage = page.locator("canvas").first();
    const box = await stage.boundingBox();
    if (box) {
      await stage.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
    }
    await page.getByRole("button", { name: "Bekijk lichtverdeling" }).click();
    await expect(page.getByTestId("wizard-next-button")).toBeEnabled();
    await page.getByTestId("wizard-next-button").click();
    await expect(page.getByText("Indicatief resultaat")).toBeVisible();
    await expect(page.getByText(/Deze berekening is indicatief/)).toBeVisible();
    await expect(page.getByText(/Indicatieve projectprijs/)).toBeVisible();
  });

  test("lead form validation and submission", async ({ page }) => {
    await page.route("**/api/public-leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, reference: "LP-TEST-001", emailSent: false }),
      });
    });

    await advanceRoom(page);
    await advanceAtmosphere(page);
    await setupFloorPlan(page);
    await generateAndOpenResult(page);
    await page.getByRole("button", { name: "Aanvragen" }).click();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByText("Vul alle verplichte velden in.")).toBeVisible();

    await page.getByLabel("Bedrijfsnaam *").fill("Test BV");
    await page.getByLabel("Contactpersoon *").fill("Jan Test");
    await page.getByLabel("Adres *", { exact: true }).fill("Straat 1");
    await page.getByLabel("Postcode *", { exact: true }).fill("1234 AB");
    await page.getByLabel("Plaats *", { exact: true }).fill("Amsterdam");
    await page.getByLabel("Telefoon *").fill("0612345678");
    await page.getByLabel("E-mail *").fill("jan@test.nl");
    await page.getByLabel("Afleveradres *").fill("Straat 1");
    await page.getByLabel("Aflever postcode *").fill("1234 AB");
    await page.getByLabel("Aflever plaats *").fill("Amsterdam");
    await page.locator('input[type="checkbox"]').last().check();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByText("Bedankt voor uw aanvraag.")).toBeVisible();
    await expect(page.getByText("LP-TEST-001")).toBeVisible();
  });

  test("public user cannot download PDF", async ({ page }) => {
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await setupFloorPlan(page);
    await generateAndOpenResult(page);
    await page.getByRole("button", { name: "Aanvragen" }).click();
    await expect(page.getByText(/geen directe PDF-download/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /download/i })).toHaveCount(0);
  });

  test("public user cannot access internal request page", async ({ page }) => {
    await page.goto("/internal/aanvragen");
    await expect(page).toHaveURL(/\/internal\/login/);
  });
});
