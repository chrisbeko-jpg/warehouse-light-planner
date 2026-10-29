import { orientedFixtureSizeM } from "@/lib/public-wizard/placement-constraints";
import type { PublicProductId } from "@/types/public-wizard";

/**
 * Minimum index step along grid columns or rows so fixture extents on that axis
 * do not touch on consecutive modules (1200×600 grid).
 */
export function minModuleIndexStepForAxis(
  productId: PublicProductId,
  rotation: number,
  axis: "col" | "row",
  cellWidthM: number,
  cellHeightM: number,
): number {
  const { widthM, heightM } = orientedFixtureSizeM(productId, rotation);
  const pitchM = axis === "col" ? cellWidthM : cellHeightM;
  const extentM = axis === "col" ? widthM : heightM;
  if (extentM >= pitchM - 0.05) return 2;
  return 1;
}

/**
 * Pick `pickCount` indices from `0..slotCount-1`, evenly spread with symmetric margins.
 * Never returns the first N indices unless that is the only centered option.
 */
export function selectEvenlySpacedIndices(
  slotCount: number,
  pickCount: number,
  minStep = 1,
): number[] | null {
  if (pickCount <= 0) return [];
  if (pickCount === 1) return [Math.floor((slotCount - 1) / 2)];
  if (pickCount > slotCount) return null;

  const maxStep = Math.floor((slotCount - 1) / (pickCount - 1));
  for (let step = maxStep; step >= Math.max(1, minStep); step--) {
    const need = (pickCount - 1) * step + 1;
    if (need > slotCount) continue;
    const start = Math.floor((slotCount - need) / 2);
    return Array.from({ length: pickCount }, (_, index) => start + index * step);
  }
  return null;
}

/** All index sets with uniform step; includes centered and offset starts for wall-margin tuning. */
export function enumerateEvenlySpacedIndexSets(
  slotCount: number,
  pickCount: number,
  minStep = 1,
): number[][] {
  if (pickCount <= 0) return [];
  if (pickCount === 1) return [[Math.floor((slotCount - 1) / 2)]];
  if (pickCount > slotCount) return [];

  const sets: number[][] = [];
  const maxStep = Math.floor((slotCount - 1) / (pickCount - 1));
  for (let step = maxStep; step >= Math.max(1, minStep); step--) {
    const need = (pickCount - 1) * step + 1;
    if (need > slotCount) continue;
    const maxStart = slotCount - need;
    const centeredStart = Math.floor((slotCount - need) / 2);
    for (let start = 0; start <= maxStart; start++) {
      sets.push(Array.from({ length: pickCount }, (_, index) => start + index * step));
    }
    void centeredStart;
  }
  const unique = new Map<string, number[]>();
  for (const set of sets) unique.set(set.join(","), set);
  const centeredStart = Math.floor((slotCount - ((pickCount - 1) * minStep + 1)) / 2);
  const span = (set: number[]) => (set.length > 0 ? set[set.length - 1]! - set[0]! : 0);
  return [...unique.values()].sort((a, b) => {
    const spanDiff = span(b) - span(a);
    if (spanDiff !== 0) return spanDiff;
    const edgeA = Math.min(a[0]!, slotCount - 1 - a[a.length - 1]!);
    const edgeB = Math.min(b[0]!, slotCount - 1 - b[b.length - 1]!);
    if (edgeB !== edgeA) return edgeB - edgeA;
    return Math.abs(a[0]! - centeredStart) - Math.abs(b[0]! - centeredStart);
  });
}

export function enumerateMatrixFactors(count: number, maxDim = 12): Array<{ rows: number; cols: number }> {
  const sizes: Array<{ rows: number; cols: number }> = [];
  for (let rows = 1; rows <= maxDim; rows++) {
    for (let cols = 1; cols <= maxDim; cols++) {
      if (rows * cols === count) sizes.push({ rows, cols });
    }
  }
  return sizes;
}
