import { test, expect } from "@playwright/test";
import {
  CEILING_GRID_M,
  snapMeters,
  snapPointToGridPx,
} from "../lib/public-wizard/grid";
import {
  getGridSpacingPx,
  panelFootprintInside,
  placePanelsOnCeilingGrid,
} from "../lib/public-wizard/ceiling-grid";
import {
  findFreeGridPosition,
  placeFixturesInPolygon,
  snapFixtureCenter,
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
const GRID_PX = CEILING_GRID_M * PPM;

test.describe("Editor placement & grid logic", () => {
  test("grid snap rounds to 0.60 m in world units", () => {
    expect(snapMeters(1.23)).toBeCloseTo(1.2, 5);
    expect(snapMeters(0.31)).toBeCloseTo(0.6, 5);
    const snapped = snapPointToGridPx({ x: 123, y: 287 }, PPM);
    expect(snapped.x % GRID_PX).toBeCloseTo(0, 5);
    expect(snapped.y % GRID_PX).toBeCloseTo(0, 5);
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

  test("rectangular room produces clean rows and columns", () => {
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

  test("drag snap searches nearby valid grid cells", () => {
    const snapped = snapFixtureCenter(512, 318, PPM, OFFICE_POLYGON, "led_panel_4000", {
      x: 500,
      y: 300,
    });
    expect(snapped).not.toBeNull();
    expect(snapped!.x % GRID_PX).toBeCloseTo(0, 4);
    expect(snapped!.y % GRID_PX).toBeCloseTo(0, 4);
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

  test("single add returns editor to select without canvas placement mode", async ({ page }) => {
    await setupEditor(page);
    await page.getByTestId("generate-light-plan-button").click();
    await page.getByTestId("add-downlight-button").click();
    await expect(page.getByTestId("add-downlight-button")).toBeVisible();
    await expect(page.getByText(/Klik op de plattegrond om/i)).toHaveCount(0);
  });
});
