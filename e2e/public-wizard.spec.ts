import { test, expect } from "@playwright/test";
import {
  advanceAtmosphere,
  advanceInputMethodDimensions,
  advanceInputMethodFloorplan,
  advanceRoom,
  advanceToFloorplanUpload,
  drawRoomPolygon,
  fillManualDimensions,
  generateAndOpenResult,
  setupEditor,
  startWizard,
  uploadFloorPlan,
  selectRoom,
} from "./helpers/wizard";

test.describe("Public LED site & wizard", () => {
  test("homepage shows AI Lichtadvies proposition", async ({ page }) => {
    await page.goto("/home");
    await expect(page.getByRole("heading", { name: /Van plattegrond naar lichtplan met AI/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start gratis AI Lichtadvies" }).first()).toBeVisible();
  });

  test("room function selection sets target lux", async ({ page }) => {
    await startWizard(page);
    await selectRoom(page, "reception_hall");
    await expect(page.getByText("250 lux")).toBeVisible();
    await selectRoom(page, "workplace_office");
    await expect(page.getByText("500 lux")).toBeVisible();
  });

  test("shows three compact room choices", async ({ page }) => {
    await startWizard(page);
    await expect(page.getByTestId("room-option-workplace_office")).toBeVisible();
    await expect(page.getByTestId("room-option-reception_hall")).toBeVisible();
    await expect(page.getByTestId("room-option-other_spaces")).toBeVisible();
    await expect(page.getByTestId("room-option-open_kantoor")).toHaveCount(0);
  });

  test("fullscreen editor layout", async ({ page }) => {
    await advanceToFloorplanUpload(page);
    await uploadFloorPlan(page);
    await expect(page.getByTestId("floor-plan-editor")).toBeVisible();
    await expect(page.getByLabel("Zoom in")).toBeVisible();
    const editor = page.getByTestId("floor-plan-editor");
    const box = await editor.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(600);
  });

  test("full wizard flow through editor", async ({ page }) => {
    await advanceToFloorplanUpload(page);
    await uploadFloorPlan(page);
    await setupEditor(page);
    await generateAndOpenResult(page);
    await expect(page.getByText("Indicatieve materiaalprijs")).toBeVisible();
    await expect(page.getByText(/Exclusief btw, verzending, montage/i)).toBeVisible();
  });

  test("manual dimensions route generates plan", async ({ page }) => {
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await advanceInputMethodDimensions(page);
    await fillManualDimensions(page);
    await generateAndOpenResult(page);
    await expect(page.getByText("8,00 × 5,00 m")).toBeVisible();
    await expect(page.getByText("500 lux")).toBeVisible();
  });

  test("result and request allow returning to editor with state", async ({ page }) => {
    await advanceToFloorplanUpload(page);
    await uploadFloorPlan(page);
    await setupEditor(page);
    await generateAndOpenResult(page);
    await page.getByTestId("edit-light-plan-button").click();
    await expect(page.getByTestId("floor-plan-editor")).toBeVisible();
    await expect(page.getByTestId("toggle-heatmap-button")).toBeVisible();
    await page.getByTestId("editor-continue-button").click();
    await expect(page.getByText("Indicatief resultaat")).toBeVisible();
    await page.getByRole("button", { name: "Aanvragen" }).click();
    await page.getByTestId("edit-light-plan-button").click();
    await expect(page.getByTestId("floor-plan-editor")).toBeVisible();
  });

  test("premium atmosphere is visible but disabled", async ({ page }) => {
    await startWizard(page);
    await selectRoom(page, "workplace_office");
    await page.getByTestId("wizard-next-button").click();
    const premium = page.getByTestId("atmosphere-option-premium_architectural");
    await expect(premium).toBeVisible();
    await expect(premium).toHaveAttribute("data-disabled", "true");
    await page.getByTestId("atmosphere-option-warm").click();
    await page.getByTestId("wizard-next-button").click();
    await expect(page.getByText("Hoe wilt u de ruimte invoeren?")).toBeVisible();
    await advanceInputMethodFloorplan(page);
    await expect(page.getByText(/plattegrond/i).first()).toBeVisible();
  });

  test("wizard CMS endpoint serves three room choices", async ({ request }) => {
    const res = await request.get("/api/cms/wizard");
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as {
      roomChoices: { id: string; title: string; suggestedLux: number }[];
      atmosphereChoices: { id: string; enabled: boolean }[];
    };
    expect(data.roomChoices.length).toBe(3);
    expect(data.roomChoices.map((c) => c.id).sort()).toEqual([
      "other_spaces",
      "reception_hall",
      "workplace_office",
    ]);
    expect(data.atmosphereChoices.some((c) => c.id === "neutraal" && c.enabled !== false)).toBeTruthy();
    expect(
      data.atmosphereChoices.some((c) => c.id === "premium_architectural" && c.enabled === false),
    ).toBeTruthy();
  });

  test("lead form validation", async ({ page }) => {
    await page.route("**/api/public-leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Aanvraag ontvangen", reference: "LP-TEST-002" }),
      });
    });
    await advanceToFloorplanUpload(page);
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
