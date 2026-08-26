import { test, expect } from "@playwright/test";
import {
  CEILING_GRID_M,
  snapMeters,
  snapPointToGridPx,
} from "../lib/public-wizard/grid";
import {
  generateGridCandidates,
  placeFixturesInPolygon,
  selectSpreadGridPoints,
} from "../lib/public-wizard/placement";
import {
  advanceAtmosphere,
  advanceRoom,
  calibrateScale,
  drawRoomPolygon,
  setupEditor,
  startWizard,
  uploadFloorPlan,
} from "./helpers/wizard";

const OFFICE_POLYGON = [
  { x: 50, y: 50 },
  { x: 950, y: 50 },
  { x: 950, y: 650 },
  { x: 50, y: 650 },
];
const PPM = 100;

test.describe("Editor placement & grid logic", () => {
  test("grid snap rounds to 0.60 m in world units", () => {
    expect(snapMeters(1.23)).toBeCloseTo(1.2, 5);
    expect(snapMeters(0.31)).toBeCloseTo(0.6, 5);
    const snapped = snapPointToGridPx({ x: 123, y: 287 }, PPM);
    expect(snapped.x % (CEILING_GRID_M * PPM)).toBeCloseTo(0, 5);
    expect(snapped.y % (CEILING_GRID_M * PPM)).toBeCloseTo(0, 5);
  });

  test("generated fixtures spread across polygon without duplicate coordinates", () => {
    const fixtures = placeFixturesInPolygon(OFFICE_POLYGON, PPM, 24, "led_panel_4000");
    expect(fixtures.length).toBe(24);

    const keys = fixtures.map((f) => `${f.x.toFixed(1)},${f.y.toFixed(1)}`);
    expect(new Set(keys).size).toBe(keys.length);

    const xs = fixtures.map((f) => f.x);
    const ys = fixtures.map((f) => f.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(PPM * 3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(PPM * 3);

    for (const fixture of fixtures) {
      expect(fixture.x % (CEILING_GRID_M * PPM)).toBeCloseTo(0, 4);
      expect(fixture.y % (CEILING_GRID_M * PPM)).toBeCloseTo(0, 4);
    }
  });

  test("selectSpreadGridPoints distributes evenly", () => {
    const candidates = generateGridCandidates(OFFICE_POLYGON, PPM);
    expect(candidates.length).toBeGreaterThan(10);
    const picked = selectSpreadGridPoints(candidates, 8);
    expect(picked).toHaveLength(8);
    const centroid = {
      x: OFFICE_POLYGON.reduce((s, p) => s + p.x, 0) / OFFICE_POLYGON.length,
      y: OFFICE_POLYGON.reduce((s, p) => s + p.y, 0) / OFFICE_POLYGON.length,
    };
    const allNearCenter = picked.every(
      (p) => Math.hypot(p.x - centroid.x, p.y - centroid.y) < PPM * 2,
    );
    expect(allNearCenter).toBeFalsy();
  });
});

test.describe("Public editor regression", () => {
  test.beforeEach(async ({ page }) => {
    await advanceRoom(page);
    await advanceAtmosphere(page);
    await uploadFloorPlan(page);
  });

  test("scale mode stops after calibration", async ({ page }) => {
    await expect(page.getByTestId("scale-instruction")).toBeVisible();
    await calibrateScale(page);
    await expect(page.getByTestId("editor-step-1")).toHaveAttribute("data-step-done", "true");
    await expect(page.getByTestId("editor-step-1")).toContainText("Schaal ingesteld ✓");
  });

  test("room draw stops after closing polygon", async ({ page }) => {
    await calibrateScale(page);
    await drawRoomPolygon(page);
    await expect(page.getByText(/Ruimte ingesteld ✓/)).toBeVisible();
    await expect(page.getByTestId("generate-light-plan-button")).toBeVisible();
  });

  test("generate plan spreads fixtures and drag keeps canvas visible", async ({ page }) => {
    await setupEditor(page);
    await page.getByTestId("generate-light-plan-button").click();
    await expect(page.getByTestId("toggle-heatmap-button")).toBeVisible();

    const editor = page.getByTestId("floor-plan-editor");
    const box = await editor.boundingBox();
    if (!box) throw new Error("no canvas");

    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
    await page.mouse.up();
    await expect(page.getByTestId("floor-plan-editor")).toBeVisible();

    await page.getByTestId("toggle-heatmap-button").click();
    await expect(page.getByText("Indicatieve lichtverdeling")).toBeVisible();
  });
});
