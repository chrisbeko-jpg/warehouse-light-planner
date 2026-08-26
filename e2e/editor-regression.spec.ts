import { test, expect } from "@playwright/test";
import {
  CEILING_GRID_M,
  snapMeters,
  snapPointToGridPx,
} from "../lib/public-wizard/grid";
import {
  buildValidGridCenters,
  getGridSpacingPx,
  getSpreadMetrics,
  panelFootprintInside,
  placePanelsOnCeilingGrid,
} from "../lib/public-wizard/ceiling-grid";
import {
  findFreeGridPosition,
  placeFixturesInPolygon,
  removeFixture,
  snapFixtureCenter,
} from "../lib/public-wizard/placement";
import { calculateIndicativeResult } from "../lib/public-wizard/calculation";
import { calculateMaterialPrice } from "../lib/public-wizard/pricing";
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
const GRID_PX = CEILING_GRID_M * PPM;
const OFFICE_BOUNDS = {
  minX: 50,
  maxX: 950,
  minY: 50,
  maxY: 650,
};

test.describe("Editor placement & grid logic", () => {
  test("grid snap rounds to 0.60 m in world units", () => {
    expect(snapMeters(1.23)).toBeCloseTo(1.2, 5);
    expect(snapMeters(0.31)).toBeCloseTo(0.6, 5);
    const snapped = snapPointToGridPx({ x: 123, y: 287 }, PPM);
    expect(snapped.x % GRID_PX).toBeCloseTo(0, 5);
    expect(snapped.y % GRID_PX).toBeCloseTo(0, 5);
  });

  test("full-room grid generation covers the room bounds", () => {
    const grid = buildValidGridCenters(OFFICE_POLYGON, PPM, true);
    expect(grid.length).toBeGreaterThan(20);
    const xs = grid.map((p) => p.x);
    const ys = grid.map((p) => p.y);
    expect(Math.min(...xs)).toBeLessThan(OFFICE_BOUNDS.minX + GRID_PX * 2);
    expect(Math.max(...xs)).toBeGreaterThan(OFFICE_BOUNDS.maxX - GRID_PX * 2);
    expect(Math.min(...ys)).toBeLessThan(OFFICE_BOUNDS.minY + GRID_PX * 2);
    expect(Math.max(...ys)).toBeGreaterThan(OFFICE_BOUNDS.maxY - GRID_PX * 2);
  });

  test("generated panel fixtures align to 600 mm grid with rectangular spacing", () => {
    const layout = placePanelsOnCeilingGrid(OFFICE_POLYGON, PPM, 20, "led_panel_4000");
    const fixtures = layout.fixtures;
    expect(fixtures.length).toBeGreaterThan(0);

    const keys = fixtures.map((f) => `${f.x.toFixed(1)},${f.y.toFixed(1)}`);
    expect(new Set(keys).size).toBe(keys.length);

    for (const fixture of fixtures) {
      expect(fixture.x % GRID_PX).toBeCloseTo(0, 4);
      expect(fixture.y % GRID_PX).toBeCloseTo(0, 4);
      expect(panelFootprintInside(fixture, PPM, OFFICE_POLYGON)).toBeTruthy();
    }

    const { rowSpacingPx, colSpacingPx } = getGridSpacingPx(fixtures);
    if (rowSpacingPx > 0) {
      expect(rowSpacingPx / GRID_PX).toBeCloseTo(Math.round(rowSpacingPx / GRID_PX), 4);
    }
    if (colSpacingPx > 0) {
      expect(colSpacingPx / GRID_PX).toBeCloseTo(Math.round(colSpacingPx / GRID_PX), 4);
    }
  });

  test("panels spread across room instead of compact center cluster", () => {
    const layout = placePanelsOnCeilingGrid(OFFICE_POLYGON, PPM, 12, "led_panel_4000");
    const fixtures = layout.fixtures;
    expect(fixtures.length).toBe(12);

    const metrics = getSpreadMetrics(fixtures, OFFICE_BOUNDS);
    expect(metrics.extentXRatio).toBeGreaterThan(0.55);
    expect(metrics.extentYRatio).toBeGreaterThan(0.45);
    expect(Math.abs(metrics.leftMarginPx - metrics.rightMarginPx)).toBeLessThan(GRID_PX * 4);
    expect(Math.abs(metrics.topMarginPx - metrics.bottomMarginPx)).toBeLessThan(GRID_PX * 4);
  });

  test("rectangular room produces straight rows and columns", () => {
    const fixtures = placeFixturesInPolygon(OFFICE_POLYGON, PPM, 12, "led_panel_4000");
    const xs = [...new Set(fixtures.map((f) => Math.round(f.x)))].sort((a, b) => a - b);
    const ys = [...new Set(fixtures.map((f) => Math.round(f.y)))].sort((a, b) => a - b);
    expect(xs.length).toBeGreaterThan(1);
    expect(ys.length).toBeGreaterThan(1);

    const colStep = xs[1]! - xs[0]!;
    const rowStep = ys[1]! - ys[0]!;
    expect(colStep / GRID_PX).toBeCloseTo(Math.round(colStep / GRID_PX), 4);
    expect(rowStep / GRID_PX).toBeCloseTo(Math.round(rowStep / GRID_PX), 4);
  });

  test("manual add position finder respects grid and footprint", () => {
    const fixtures = placeFixturesInPolygon(OFFICE_POLYGON, PPM, 6, "led_panel_4000");
    const free = findFreeGridPosition(OFFICE_POLYGON, PPM, fixtures, "led_panel_4000");
    expect(free).not.toBeNull();
    expect(free!.x % GRID_PX).toBeCloseTo(0, 4);
    expect(free!.y % GRID_PX).toBeCloseTo(0, 4);
  });

  test("drag snap searches nearby valid grid cells and avoids overlap", () => {
    const fixtures = placeFixturesInPolygon(OFFICE_POLYGON, PPM, 4, "led_panel_4000");
    const source = fixtures[0]!;
    const snapped = snapFixtureCenter(
      source.x + GRID_PX,
      source.y,
      PPM,
      OFFICE_POLYGON,
      "led_panel_4000",
      source,
      fixtures,
      source.id,
    );
    expect(snapped).not.toBeNull();
    expect(snapped!.x % GRID_PX).toBeCloseTo(0, 4);
    expect(snapped!.y % GRID_PX).toBeCloseTo(0, 4);
    const duplicate = fixtures.some(
      (f) =>
        f.id !== source.id &&
        Math.abs(f.x - snapped!.x) < 2 &&
        Math.abs(f.y - snapped!.y) < 2,
    );
    expect(duplicate).toBeFalsy();
  });

  test("delete updates lux and price calculations", () => {
    const fixtures = placeFixturesInPolygon(OFFICE_POLYGON, PPM, 8, "led_panel_4000");
    const areaM2 = 54;
    const beforeLux = calculateIndicativeResult(areaM2, 500, 2.7, fixtures);
    const beforePrice = calculateMaterialPrice(fixtures);
    const remaining = removeFixture(fixtures, fixtures[0]!.id);
    const afterLux = calculateIndicativeResult(areaM2, 500, 2.7, remaining);
    const afterPrice = calculateMaterialPrice(remaining);
    expect(beforeLux!.fixtureCount).toBe(8);
    expect(afterLux!.fixtureCount).toBe(7);
    expect(afterPrice.totalEuro).toBeLessThan(beforePrice.totalEuro);
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

  test("generate plan uses ceiling grid and drag keeps canvas visible", async ({ page }) => {
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

  test("add panel button adds exactly one fixture per click", async ({ page }) => {
    await setupEditor(page);
    await page.getByTestId("generate-light-plan-button").click();
    await expect(page.getByTestId("fixtures-count")).toBeVisible();
    const beforeText = await page.getByTestId("fixtures-count").textContent();
    const before = Number(beforeText?.replace(/\D/g, "") ?? "0");

    await page.getByTestId("add-panel-button").click();
    await expect(page.getByTestId("fixtures-count")).toHaveText(`Armaturen: ${before + 1}`);

    await page.getByTestId("editor-canvas-area").click({ position: { x: 200, y: 200 } });
    await page.getByTestId("editor-canvas-area").click({ position: { x: 300, y: 300 } });
    await expect(page.getByTestId("fixtures-count")).toHaveText(`Armaturen: ${before + 1}`);

    await page.getByTestId("add-panel-button").click();
    await expect(page.getByTestId("fixtures-count")).toHaveText(`Armaturen: ${before + 2}`);
  });

  test("Delete and Backspace remove selected luminaire", async ({ page }) => {
    await setupEditor(page);
    await page.getByTestId("generate-light-plan-button").click();
    const beforeText = await page.getByTestId("fixtures-count").textContent();
    const before = Number(beforeText?.replace(/\D/g, "") ?? "0");

    await page.getByTestId("add-panel-button").click();
    await expect(page.getByTestId("fixtures-count")).toHaveText(`Armaturen: ${before + 1}`);
    await page.keyboard.press("Delete");
    await expect(page.getByTestId("fixtures-count")).toHaveText(`Armaturen: ${before}`);

    await page.getByTestId("add-panel-button").click();
    await expect(page.getByTestId("fixtures-count")).toHaveText(`Armaturen: ${before + 1}`);
    await page.keyboard.press("Backspace");
    await expect(page.getByTestId("fixtures-count")).toHaveText(`Armaturen: ${before}`);
  });

  test("single add returns editor to select without canvas placement mode", async ({ page }) => {
    await setupEditor(page);
    await page.getByTestId("generate-light-plan-button").click();
    await page.getByTestId("add-downlight-button").click();
    await expect(page.getByTestId("add-downlight-button")).toBeVisible();
    await expect(page.getByText(/Klik op de plattegrond om/i)).toHaveCount(0);
  });
});
