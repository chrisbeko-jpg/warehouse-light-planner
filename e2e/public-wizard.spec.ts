import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const FIXTURE_PNG = path.join(__dirname, "fixtures", "office-floor.png");

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

async function startWizard(page: import("@playwright/test").Page) {
  await page.goto("/lichtadvies");
  await expect(page.getByText("Welke ruimte wilt u verlichten?")).toBeVisible();
}

async function advanceRoom(page: import("@playwright/test").Page) {
  await startWizard(page);
  await page.getByTestId("room-option-open_kantoor").click();
  await expect(page.getByTestId("wizard-next-button")).toBeEnabled({ timeout: 10000 });
  await page.getByTestId("wizard-next-button").click();
}

async function advanceAtmosphere(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Helder & functioneel" }).click();
  await page.getByTestId("wizard-next-button").click();
}

async function uploadFloorPlan(page: import("@playwright/test").Page) {
  await page.setInputFiles('input[type="file"]', FIXTURE_PNG);
  await page.getByRole("button", { name: "Plattegrond gebruiken" }).click();
  await expect(page.getByTestId("floor-plan-editor")).toBeVisible();
}

async function setupEditor(page: import("@playwright/test").Page) {
  const stage = page.locator("canvas").first();
  await expect(stage).toBeVisible();
  const box = await stage.boundingBox();
  if (!box) throw new Error("Stage not found");

  await stage.click({ position: { x: box.width * 0.3, y: box.height * 0.5 }, force: true });
  await stage.click({ position: { x: box.width * 0.7, y: box.height * 0.5 }, force: true });
  await expect(page.getByPlaceholder("4,80 m")).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder("4,80 m").fill("5");
  await page.getByTestId("apply-scale-button").click();

  await page.getByRole("button", { name: "Ruimte tekenen" }).click();
  await stage.click({ position: { x: box.width * 0.15, y: box.height * 0.15 } });
  await stage.click({ position: { x: box.width * 0.85, y: box.height * 0.15 } });
  await stage.click({ position: { x: box.width * 0.85, y: box.height * 0.85 } });
  await stage.click({ position: { x: box.width * 0.15, y: box.height * 0.85 } });
  await page.getByRole("button", { name: "Ruimte afronden" }).click();
}

async function generateAndOpenResult(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Genereer mijn lichtplan" }).click();
  await expect(page.getByRole("button", { name: "Bekijk lichtverdeling" })).toBeVisible();
  await page.getByTestId("wizard-next-button").click();
  await expect(page.getByText("Indicatief resultaat")).toBeVisible();
}

test.describe("Public LED site & wizard", () => {
  test("homepage shows AI Lichtadvies proposition", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: /Van plattegrond naar lichtplan met AI/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start gratis AI Lichtadvies" }).first()).toBeVisible();
  });

  test("room function selection", async ({ page }) => {
    await startWizard(page);
    await page.getByTestId("room-option-gang").click();
    await expect(page.locator('input[type="number"]').nth(1)).toHaveValue("100");
  });

  test("fullscreen editor layout", async ({ page }) => {
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await uploadFloorPlan(page);
    await expect(page.getByTestId("floor-plan-editor")).toBeVisible();
    await expect(page.getByLabel("Zoom in")).toBeVisible();
    const editor = page.getByTestId("floor-plan-editor");
    const box = await editor.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(600);
  });

  test("full wizard flow through editor", async ({ page }) => {
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await uploadFloorPlan(page);
    await setupEditor(page);
    await generateAndOpenResult(page);
    await expect(page.getByText("Indicatieve materiaalprijs")).toBeVisible();
    await expect(page.getByText(/Exclusief btw, verzending, montage/i)).toBeVisible();
  });

  test("lead form validation", async ({ page }) => {
    await page.route("**/api/public-leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, reference: "LP-TEST-002", emailSent: false }),
      });
    });
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await uploadFloorPlan(page);
    await setupEditor(page);
    await generateAndOpenResult(page);
    await page.getByRole("button", { name: "Aanvragen" }).click();
    await page.getByRole("button", { name: "Ontvang lichtplan + offerte" }).click();
    await expect(page.getByText("Vul alle verplichte velden in.")).toBeVisible();
  });

  test("public user cannot access internal pages", async ({ page }) => {
    await page.goto("/internal/aanvragen");
    await expect(page).toHaveURL(/\/internal\/login/);
    await page.goto("/internal/content");
    await expect(page).toHaveURL(/\/internal\/login/);
  });

  test("sitemap and robots are available", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain("Sitemap:");
  });
});
