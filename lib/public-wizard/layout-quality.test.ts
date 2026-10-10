import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateLayoutQuality,
  isCompleteRectangularMatrix,
  layoutQualityBeats,
} from "@/lib/public-wizard/layout-quality";
import type { Point2D } from "@/types/floor-plan";

function bounds(w: number, h: number) {
  return { minX: 0, maxX: w, minY: 0, maxY: h };
}

function fullGrid(rows: number, cols: number, w: number, h: number): Point2D[] {
  const points: Point2D[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      points.push({
        x: ((c + 1) / (cols + 1)) * w,
        y: ((r + 1) / (rows + 1)) * h,
      });
    }
  }
  return points;
}

function twoWallRows(w: number, h: number, cols: number): Point2D[] {
  const points: Point2D[] = [];
  const yTop = h * 0.12;
  const yBottom = h * 0.88;
  for (let c = 0; c < cols; c++) {
    const x = ((c + 1) / (cols + 1)) * w;
    points.push({ x, y: yTop });
    points.push({ x, y: yBottom });
  }
  return points;
}

test("isCompleteRectangularMatrix accepts full 4×4 grid", () => {
  const points = fullGrid(4, 4, 800, 700);
  assert.equal(isCompleteRectangularMatrix(points), true);
});

test("isCompleteRectangularMatrix rejects staggered row counts", () => {
  const good = fullGrid(4, 4, 800, 700);
  const staggered = [...good.slice(0, 13), { x: 50, y: 500 }];
  assert.equal(isCompleteRectangularMatrix(staggered), false);
});

test("evaluateLayoutQuality rejects two full edge rows with empty middle", () => {
  const b = bounds(800, 600);
  const bad = twoWallRows(800, 600, 7);
  const q = evaluateLayoutQuality(bad, b);
  assert.equal(q.edgeOnlyRows, true);
  assert.equal(q.rejected, true);
});

test("evaluateLayoutQuality rejects two edge columns in wide room", () => {
  const b = bounds(800, 500);
  const points: Point2D[] = [];
  const xLeft = 800 * 0.1;
  const xRight = 800 * 0.9;
  for (let r = 0; r < 6; r++) {
    const y = ((r + 1) / 7) * 500;
    points.push({ x: xLeft, y });
    points.push({ x: xRight, y });
  }
  const q = evaluateLayoutQuality(points, b);
  assert.equal(q.edgeOnlyColumns, true);
  assert.equal(q.rejected, true);
});

test("full 4×4 matrix beats two edge rows", () => {
  const b = bounds(800, 700);
  const bad = twoWallRows(800, 700, 7);
  const good = fullGrid(4, 4, 800, 700);
  assert.ok(layoutQualityBeats(good, bad, b));
});
