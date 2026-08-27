import { test, expect, devices } from "@playwright/test";
import {
  advanceAtmosphere,
  advanceRoom,
  calibrateScale,
  drawRoomPolygon,
  generateAndOpenResult,
  setupEditor,
  uploadFloorPlan,
} from "./helpers/wizard";

async function clickCanvasPoint(page: import("@playwright/test").Page, relX: number, relY: number) {
  const canvasArea = page.getByTestId("editor-canvas-area");
  await expect(canvasArea).toBeVisible();
  const box = await canvasArea.boundingBox();
  if (!box) throw new Error("Canvas area not found");
  await page.mouse.click(box.x + box.width * relX, box.y + box.height * relY);
}

async function openEditorStepsPanel(page: import("@playwright/test").Page) {
  const panel = page.getByTestId("editor-steps-panel");
  if (!(await panel.isVisible())) {
    await page.getByRole("button", { name: "Stappen" }).click();
  }
  await expect(panel).toBeVisible();
}

test.describe("Scale reset (iPad/touch editor)", () => {
  test.beforeEach(async ({ page }) => {
    await advanceRoom(page, "open_kantoor");
    await advanceAtmosphere(page);
    await uploadFloorPlan(page);
    await openEditorStepsPanel(page);
  });

  test("Opnieuw during active calibration clears draft points", async ({ page }) => {
    await clickCanvasPoint(page, 0.3, 0.5);
    await expect(page.getByTestId("calibration-restart-button")).toBeVisible();
    await page.getByTestId("calibration-restart-button").click();
    await expect(page.getByTestId("scale-instruction")).toContainText(
      "Klik twee punten op de plattegrond waarvan u de werkelijke afstand kent.",
    );
    await expect(page.getByTestId("calibration-restart-button")).toHaveCount(0);
  });

  test("Opnieuw with two selected points closes distance dialog and clears points", async ({ page }) => {
    await clickCanvasPoint(page, 0.3, 0.5);
    await clickCanvasPoint(page, 0.7, 0.5);
    await expect(page.getByTestId("scale-distance-dialog")).toBeVisible();
    await page.getByTestId("calibration-restart-dialog-button").click();
    await expect(page.getByTestId("scale-distance-dialog")).toHaveCount(0);
    await expect(page.getByTestId("calibration-restart-button")).toHaveCount(0);
    await expect(page.getByTestId("scale-instruction")).toBeVisible();
  });

  test("reset without confirmation leaves design data intact", async ({ page }) => {
    await setupEditor(page);
    await page.getByTestId("generate-light-plan-button").click();
    await expect(page.getByTestId("toggle-heatmap-button")).toBeVisible();

    await page.getByTestId("reset-scale-button").click();
    await expect(page.getByTestId("scale-reset-dialog")).toBeVisible();
    await page.getByTestId("scale-reset-cancel-button").click();

    await expect(page.getByTestId("editor-step-1")).toHaveAttribute("data-step-done", "true");
    await expect(page.getByTestId("editor-step-2")).toHaveAttribute("data-step-done", "true");
    await expect(page.getByTestId("toggle-heatmap-button")).toBeVisible();
    await expect(page.getByTestId("fixtures-count")).toBeVisible();
  });

  test("confirmed scale reset clears scale-dependent data and preserves wizard choices", async ({ page }) => {
    await setupEditor(page);
    await page.getByTestId("generate-light-plan-button").click();
    await expect(page.getByTestId("fixtures-count")).toBeVisible();

    const subtitleBefore = await page
      .getByTestId("floor-plan-editor")
      .locator("header p")
      .nth(1)
      .textContent();

    await page.getByTestId("reset-scale-button").click();
    await page.getByTestId("scale-reset-confirm-button").click();

    await expect(page.getByTestId("scale-instruction")).toContainText(
      "Klik twee punten op de plattegrond waarvan u de werkelijke afstand kent.",
    );
    await expect(page.getByTestId("editor-step-1")).toHaveAttribute("data-step-done", "false");
    await expect(page.getByTestId("editor-step-2")).toHaveAttribute("data-step-done", "false");
    await expect(page.getByTestId("toggle-heatmap-button")).toHaveCount(0);
    await expect(page.getByTestId("fixtures-count")).toHaveCount(0);
    await expect(page.getByTestId("generate-light-plan-button")).toHaveCount(0);
    await expect(page.getByTestId("editor-canvas-area")).toBeVisible();

    const subtitleAfter = await page
      .getByTestId("floor-plan-editor")
      .locator("header p")
      .nth(1)
      .textContent();
    expect(subtitleAfter).toBe(subtitleBefore);
    expect(subtitleAfter).toContain("Open kantoor");
    expect(subtitleAfter).toMatch(/2,70 m/);
  });

  test("confirmed reset clears result pricing until plan is regenerated", async ({ page }) => {
    await setupEditor(page);
    await generateAndOpenResult(page);
    await expect(page.getByText("Indicatieve materiaalprijs")).toBeVisible();

    await page.getByTestId("edit-light-plan-button").click();
    await openEditorStepsPanel(page);
    await page.getByTestId("reset-scale-button").click();
    await page.getByTestId("scale-reset-confirm-button").click();

    await calibrateScale(page);
    await drawRoomPolygon(page);
    await page.getByTestId("generate-light-plan-button").click();
    await page.getByTestId("editor-continue-button").click();
    await expect(page.getByText("Indicatieve materiaalprijs")).toBeVisible();
  });

  test("scale reset dialog buttons meet touch target minimum height", async ({ page }) => {
    await calibrateScale(page);
    await drawRoomPolygon(page);
    await page.getByTestId("reset-scale-button").click();

    const cancelBox = await page.getByTestId("scale-reset-cancel-button").boundingBox();
    const confirmBox = await page.getByTestId("scale-reset-confirm-button").boundingBox();
    expect(cancelBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(confirmBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});

test("iPad viewport supports touch-sized scale controls", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["iPad Pro 11"] });
  const page = await context.newPage();
  try {
    await advanceRoom(page, "open_kantoor");
    await advanceAtmosphere(page);
    await uploadFloorPlan(page);
    await clickCanvasPoint(page, 0.3, 0.5);
    const overlayRestartBox = await page.getByTestId("calibration-restart-overlay-button").boundingBox();
    expect(overlayRestartBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.getByTestId("calibration-restart-overlay-button").click();

    await calibrateScale(page);
    await openEditorStepsPanel(page);
    await expect(page.getByTestId("reset-scale-button")).toBeVisible();
    const resetButtonBox = await page.getByTestId("reset-scale-button").boundingBox();
    expect(resetButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.getByTestId("reset-scale-button").click();
    await expect(page.getByTestId("scale-reset-dialog")).toBeVisible();
  } finally {
    await context.close();
  }
});
