import { test, expect } from "@playwright/test";
import {
  advanceAtmosphere,
  advanceRoom,
  drawRoomPolygon,
  generateAndOpenResult,
  setupEditor,
  startWizard,
  uploadFloorPlan,
  calibrateScale,
  selectRoom,
} from "./helpers/wizard";

test.describe("Public LED site & wizard", () => {
  test("homepage shows AI Lichtadvies proposition", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: /Van plattegrond naar lichtplan met AI/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start gratis AI Lichtadvies" }).first()).toBeVisible();
  });

  test("room function selection", async ({ page }) => {
    await startWizard(page);
    await selectRoom(page, "gang");
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
