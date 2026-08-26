import { expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

export const FIXTURE_PNG = path.join(__dirname, "fixtures", "office-floor.png");

export function createTestPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAA/klEQVR42u3RAQ0AAAgDINc/9K3hYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPBrBqoAAfR7o0AAAAAASUVORK5CYII=",
    "base64",
  );
}

export async function startWizard(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("skip-ai-room", "1");
  });
  await page.goto("/lichtadvies");
  await expect(page.getByText("Welke ruimte wilt u verlichten?")).toBeVisible();
}

export async function selectRoom(page: Page, roomId: string) {
  const option = page.getByTestId(`room-option-${roomId}`);
  await option.scrollIntoViewIfNeeded();
  await expect(option).toBeVisible();
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });
  await expect(page.getByTestId("wizard-next-button")).toBeEnabled({ timeout: 5000 });
}

export async function advanceRoom(page: Page, roomId = "open_kantoor") {
  await startWizard(page);
  await selectRoom(page, roomId);
  await page.getByTestId("wizard-next-button").click();
}

export async function advanceAtmosphere(page: Page) {
  await page.getByRole("button", { name: "Helder & functioneel" }).click();
  await page.getByTestId("wizard-next-button").click();
}

export async function uploadFloorPlan(page: Page) {
  const dir = path.dirname(FIXTURE_PNG);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FIXTURE_PNG)) {
    fs.writeFileSync(FIXTURE_PNG, createTestPng());
  }
  await page.setInputFiles('input[type="file"]', FIXTURE_PNG);
  await page.getByRole("button", { name: "Plattegrond gebruiken" }).click();
  await expect(page.getByTestId("floor-plan-editor")).toBeVisible();
}

async function clickEditorCanvas(page: Page, relX: number, relY: number) {
  const canvasArea = page.getByTestId("editor-canvas-area");
  await expect(canvasArea).toBeVisible();
  const box = await canvasArea.boundingBox();
  if (!box) throw new Error("Canvas area not found");
  await page.mouse.click(box.x + box.width * relX, box.y + box.height * relY);
}

export async function calibrateScale(page: Page) {
  await clickEditorCanvas(page, 0.3, 0.5);
  await clickEditorCanvas(page, 0.7, 0.5);
  await expect(page.getByPlaceholder("4,80 m")).toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder("4,80 m").fill("5");
  await page.getByTestId("apply-scale-button").click();
  await expect(page.getByTestId("scale-instruction")).toHaveCount(0, { timeout: 10000 });
}

export async function drawRoomPolygon(page: Page) {
  await page.waitForTimeout(300);
  await clickEditorCanvas(page, 0.35, 0.42);
  await page.waitForTimeout(150);
  await clickEditorCanvas(page, 0.65, 0.42);
  await page.waitForTimeout(150);
  await clickEditorCanvas(page, 0.65, 0.58);
  await page.waitForTimeout(150);
  await clickEditorCanvas(page, 0.35, 0.58);
  await page.waitForTimeout(150);
  await clickEditorCanvas(page, 0.35, 0.42);
  await expect(page.getByTestId("editor-step-2")).toHaveAttribute("data-step-done", "true", {
    timeout: 15000,
  });
}

export async function setupEditor(page: Page) {
  await calibrateScale(page);
  await drawRoomPolygon(page);
}

export async function generateAndOpenResult(page: Page) {
  await page.getByTestId("generate-light-plan-button").click();
  await expect(page.getByTestId("toggle-heatmap-button")).toBeVisible();
  await page.getByTestId("editor-continue-button").click();
  await expect(page.getByText("Indicatief resultaat")).toBeVisible();
}
