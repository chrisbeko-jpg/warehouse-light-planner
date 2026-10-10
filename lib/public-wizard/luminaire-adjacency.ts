import { orientedFixtureSizeM } from "@/lib/public-wizard/placement-constraints";
import type { Point2D } from "@/types/floor-plan";
import type { PublicProductId } from "@/types/public-wizard";

/** Edge gap at or below this is treated as direct adjacency (touching luminaires). */
export const ADJACENT_EDGE_GAP_TOLERANCE_M = 0.04;

export interface FixtureFootprintM {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function fixtureFootprintM(
  center: Point2D,
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation = 0,
): FixtureFootprintM {
  const { widthM, heightM } = orientedFixtureSizeM(productId, rotation);
  const cx = center.x / pixelsPerMeter;
  const cy = center.y / pixelsPerMeter;
  return {
    minX: cx - widthM / 2,
    maxX: cx + widthM / 2,
    minY: cy - heightM / 2,
    maxY: cy + heightM / 2,
  };
}

function axisOverlap(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
  toleranceM: number,
): boolean {
  return aMin <= bMax + toleranceM && bMin <= aMax + toleranceM;
}

export function edgeToEdgeGapBetweenFootprints(a: FixtureFootprintM, b: FixtureFootprintM): {
  gapX: number;
  gapY: number;
} {
  const gapX = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const gapY = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
  return { gapX, gapY };
}

export interface AdjacentLuminaireCounts {
  horizontal: number;
  vertical: number;
  totalPairs: number;
}

/**
 * Count fixture pairs that share an edge (horizontal or vertical neighbours).
 * Uses rectangular footprints, not centre-point distance alone.
 */
export function countAdjacentLuminaires(
  points: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation = 0,
  toleranceM = ADJACENT_EDGE_GAP_TOLERANCE_M,
): AdjacentLuminaireCounts {
  if (points.length < 2 || pixelsPerMeter <= 0) {
    return { horizontal: 0, vertical: 0, totalPairs: 0 };
  }

  const footprints = points.map((p) => fixtureFootprintM(p, pixelsPerMeter, productId, rotation));
  let horizontal = 0;
  let vertical = 0;

  for (let i = 0; i < footprints.length; i++) {
    for (let j = i + 1; j < footprints.length; j++) {
      const fi = footprints[i]!;
      const fj = footprints[j]!;
      const { gapX, gapY } = edgeToEdgeGapBetweenFootprints(fi, fj);

      if (
        gapX <= toleranceM &&
        axisOverlap(fi.minY, fi.maxY, fj.minY, fj.maxY, toleranceM)
      ) {
        horizontal++;
        continue;
      }
      if (
        gapY <= toleranceM &&
        axisOverlap(fi.minX, fi.maxX, fj.minX, fj.maxX, toleranceM)
      ) {
        vertical++;
      }
    }
  }

  return { horizontal, vertical, totalPairs: horizontal + vertical };
}

/** Minimum edge-to-edge gap among all distinct fixture pairs (meters). */
export function minEdgeToEdgeGapM(
  points: Point2D[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation = 0,
): number {
  if (points.length < 2) return Infinity;
  const footprints = points.map((p) => fixtureFootprintM(p, pixelsPerMeter, productId, rotation));
  let minGap = Infinity;
  for (let i = 0; i < footprints.length; i++) {
    for (let j = i + 1; j < footprints.length; j++) {
      const { gapX, gapY } = edgeToEdgeGapBetweenFootprints(footprints[i]!, footprints[j]!);
      minGap = Math.min(minGap, gapX, gapY);
    }
  }
  return minGap;
}

/** True when consecutive picks along a module row would touch (same grid row). */
export function colIndicesHaveMinEdgeGap(
  colList: { point: Point2D }[],
  indices: number[],
  pixelsPerMeter: number,
  productId: PublicProductId,
  rotation: number,
  minFreeGapM = ADJACENT_EDGE_GAP_TOLERANCE_M,
): boolean {
  if (indices.length < 2) return true;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    const a = colList[sorted[i - 1]!]?.point;
    const b = colList[sorted[i]!]?.point;
    if (!a || !b) return false;
    const fa = fixtureFootprintM(a, pixelsPerMeter, productId, rotation);
    const fb = fixtureFootprintM(b, pixelsPerMeter, productId, rotation);
    const { gapX, gapY } = edgeToEdgeGapBetweenFootprints(fa, fb);
    if (
      axisOverlap(fa.minY, fa.maxY, fb.minY, fb.maxY, minFreeGapM) &&
      gapX <= minFreeGapM
    ) {
      return false;
    }
    if (
      axisOverlap(fa.minX, fa.maxX, fb.minX, fb.maxX, minFreeGapM) &&
      gapY <= minFreeGapM
    ) {
      return false;
    }
  }
  return true;
}
