import { computeLayoutWallMarginsM } from "@/lib/public-wizard/layout-wall-clearance";
import {
  getFixtureFootprintCorners,
  orientedFixtureSizeM,
} from "@/lib/public-wizard/placement-constraints";
import type { RoomBounds } from "@/lib/public-wizard/layout-quality";
import type { Point2D } from "@/types/floor-plan";
import type { PublicProductId } from "@/types/public-wizard";

export interface MatrixSpacingMetrics {
  centerPitchXM: number;
  centerPitchYM: number;
  edgeGapXM: number;
  edgeGapYM: number;
  wallMarginLeftM: number;
  wallMarginRightM: number;
  wallMarginTopM: number;
  wallMarginBottomM: number;
  spacingImbalance: number;
  wallMarginBalance: number;
  minWallMarginM: number;
}

function uniqueSorted(values: number[], roundPx = 2): number[] {
  return [...new Set(values.map((v) => Math.round(v * roundPx) / roundPx))].sort((a, b) => a - b);
}

function meanGap(positionsM: number[]): number {
  if (positionsM.length < 2) return 0;
  const gaps = positionsM.slice(1).map((p, i) => p - positionsM[i]!);
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

function minEdgeGapBetweenAxes(
  points: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation: number,
  axis: "x" | "y",
): number {
  if (points.length < 2) return Infinity;
  const sorted = [...points].sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
  let minGapM = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      const ca = getFixtureFootprintCorners(a, pixelsPerMeter, productId, rotation);
      const cb = getFixtureFootprintCorners(b, pixelsPerMeter, productId, rotation);
      const aMax = axis === "x" ? Math.max(...ca.map((c) => c.x)) : Math.max(...ca.map((c) => c.y));
      const bMin = axis === "x" ? Math.min(...cb.map((c) => c.x)) : Math.min(...cb.map((c) => c.y));
      const gapPx = bMin - aMax;
      if (gapPx >= -0.5) {
        minGapM = Math.min(minGapM, gapPx / pixelsPerMeter);
      }
    }
  }
  return Number.isFinite(minGapM) ? Math.max(0, minGapM) : 0;
}

export function computeMatrixSpacingMetrics(
  points: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation: number,
  bounds: RoomBounds,
  roomVertices: Point2D[],
): MatrixSpacingMetrics {
  const ppm = pixelsPerMeter;
  const xsM = uniqueSorted(points.map((p) => p.x / ppm));
  const ysM = uniqueSorted(points.map((p) => p.y / ppm));
  const centerPitchXM = meanGap(xsM);
  const centerPitchYM = meanGap(ysM);
  const edgeGapXM = minEdgeGapBetweenAxes(points, ppm, productId, rotation, "x");
  const edgeGapYM = minEdgeGapBetweenAxes(points, ppm, productId, rotation, "y");

  const layoutWalls = computeLayoutWallMarginsM(
    points,
    ppm,
    roomVertices,
    productId,
    rotation,
  );
  const wallMarginLeftM = layoutWalls.leftM;
  const wallMarginRightM = layoutWalls.rightM;
  const wallMarginTopM = layoutWalls.topM;
  const wallMarginBottomM = layoutWalls.bottomM;

  const pitchRatio =
    centerPitchXM > 0.01 && centerPitchYM > 0.01
      ? Math.max(centerPitchXM, centerPitchYM) / Math.min(centerPitchXM, centerPitchYM)
      : 1;
  const spacingImbalance = pitchRatio > 1.01 ? Math.log(pitchRatio) : 0;

  const { widthM, heightM } = orientedFixtureSizeM(productId, rotation);
  const idealMarginX = centerPitchXM > 0 ? centerPitchXM / 2 : widthM;
  const idealMarginY = centerPitchYM > 0 ? centerPitchYM / 2 : heightM;
  const marginErrX =
    Math.abs(wallMarginLeftM - idealMarginX) + Math.abs(wallMarginRightM - idealMarginX);
  const marginErrY =
    Math.abs(wallMarginTopM - idealMarginY) + Math.abs(wallMarginBottomM - idealMarginY);
  const wallMarginBalance = marginErrX + marginErrY;

  return {
    centerPitchXM,
    centerPitchYM,
    edgeGapXM,
    edgeGapYM,
    wallMarginLeftM,
    wallMarginRightM,
    wallMarginTopM,
    wallMarginBottomM,
    spacingImbalance,
    wallMarginBalance,
    minWallMarginM: layoutWalls.minM,
  };
}
