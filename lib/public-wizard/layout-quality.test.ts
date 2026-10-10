import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateLayoutQuality,
  layoutQualityBeats,
} from "@/lib/public-wizard/layout-quality";
import type { Point2D } from "@/types/floor-plan";

function bounds(w: number, h: number) {
  return { minX: 0, maxX: w, minY: 0, maxY: h };
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

function staggeredFourRows(w: number, h: number): Point2D[] {
  const counts = [4, 3, 4, 3];
  const ys = [0.2, 0.4, 0.6, 0.8].map((f) => f * h);
  const points: Point2D[] = [];
  for (let r = 0; r < counts.length; r++) {
    const n = counts[r]!;
    for (let c = 0; c < n; c++) {
      points.push({ x: ((c + 1) / (n + 1)) * w, y: ys[r]! });
    }
  }
  return points;
}

test("evaluateLayoutQuality rejects two full edge rows with empty middle", () => {
  const b = bounds(800, 600);
  const bad = twoWallRows(800, 600, 7);
  const q = evaluateLayoutQuality(bad, b);
  assert.equal(q.edgeOnlyRows, true);
  assert.equal(q.rejected, true);
});

test("staggered 4-row layout beats two edge rows", () => {
  const b = bounds(800, 600);
  const bad = twoWallRows(800, 600, 7);
  const good = staggeredFourRows(800, 600);
  assert.ok(layoutQualityBeats(good, bad, b));
  assert.ok(evaluateLayoutQuality(good, b).score > evaluateLayoutQuality(bad, b).score);
});
