import type { Point2D } from "@/types/floor-plan";
import type { Room3DWindow } from "@/types/public-wizard";

export interface Room3DOrigin {
  originXPx: number;
  originYPx: number;
  pixelsPerMeter: number;
}

export function computeRoom3DOrigin(vertices: Point2D[]): Pick<Room3DOrigin, "originXPx" | "originYPx"> {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  return {
    originXPx: Math.min(...xs),
    originYPx: Math.min(...ys),
  };
}

export function makeRoom3DOrigin(vertices: Point2D[], pixelsPerMeter: number): Room3DOrigin {
  return { ...computeRoom3DOrigin(vertices), pixelsPerMeter };
}

/** Map Konva canvas coordinates (Y down) to floor plane X/Z in meters (Y up in 3D). */
export function canvasPointToFloorM(
  point: Point2D,
  origin: Room3DOrigin,
): { x: number; z: number } {
  const ppm = origin.pixelsPerMeter;
  return {
    x: (point.x - origin.originXPx) / ppm,
    z: (point.y - origin.originYPx) / ppm,
  };
}

export function floorPolygonM(
  vertices: Point2D[],
  origin: Room3DOrigin,
): Array<{ x: number; z: number }> {
  return vertices.map((v) => canvasPointToFloorM(v, origin));
}

export interface AxisAlignedBoundsM {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  spanX: number;
  spanZ: number;
}

export function roomAxisBoundsM(vertices: Point2D[], origin: Room3DOrigin): AxisAlignedBoundsM {
  const pts = floorPolygonM(vertices, origin);
  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    spanX: maxX - minX,
    spanZ: maxZ - minZ,
  };
}

export interface WallSegmentM {
  index: number;
  start: { x: number; z: number };
  end: { x: number; z: number };
  lengthM: number;
  /** Outward normal on the floor plane (XZ). */
  normalX: number;
  normalZ: number;
}

export function wallSegmentsM(vertices: Point2D[], origin: Room3DOrigin): WallSegmentM[] {
  const floor = floorPolygonM(vertices, origin);
  const segments: WallSegmentM[] = [];
  for (let i = 0; i < floor.length; i++) {
    const start = floor[i]!;
    const end = floor[(i + 1) % floor.length]!;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthM = Math.hypot(dx, dz);
    if (lengthM < 1e-6) continue;
    const nx = dz / lengthM;
    const nz = -dx / lengthM;
    segments.push({
      index: i,
      start,
      end,
      lengthM,
      normalX: nx,
      normalZ: nz,
    });
  }
  return segments;
}

export function fixtureFloorPositionM(
  fixture: Point2D,
  origin: Room3DOrigin,
): { x: number; z: number } {
  return canvasPointToFloorM(fixture, origin);
}

export function clampWindowOnWall(
  window: Pick<Room3DWindow, "wallIndex" | "offsetAlongWallM" | "widthM">,
  wall: WallSegmentM,
  marginM = 0.05,
): number {
  const maxOffset = Math.max(marginM, wall.lengthM - window.widthM - marginM);
  if (maxOffset <= marginM) return marginM;
  return Math.min(Math.max(window.offsetAlongWallM, marginM), maxOffset);
}

export function windowsOverlap(a: Room3DWindow, b: Room3DWindow, gapM = 0.05): boolean {
  if (a.wallIndex !== b.wallIndex) return false;
  const a0 = a.offsetAlongWallM;
  const a1 = a.offsetAlongWallM + a.widthM;
  const b0 = b.offsetAlongWallM;
  const b1 = b.offsetAlongWallM + b.widthM;
  return a0 < b1 + gapM && b0 < a1 + gapM;
}

export function validateWindowOnWall(
  window: Room3DWindow,
  walls: WallSegmentM[],
  existing: Room3DWindow[],
): Room3DWindow | null {
  const wall = walls[window.wallIndex];
  if (!wall) return null;
  if (window.widthM <= 0 || window.heightM <= 0) return null;
  if (window.widthM > wall.lengthM - 0.1) return null;
  const offsetAlongWallM = clampWindowOnWall(window, wall);
  const normalized: Room3DWindow = { ...window, offsetAlongWallM };
  for (const other of existing) {
    if (other.id === window.id) continue;
    if (windowsOverlap(normalized, other)) return null;
  }
  return normalized;
}

export const DEFAULT_WINDOW_3D: Omit<Room3DWindow, "id"> = {
  wallIndex: 0,
  offsetAlongWallM: 0.9,
  widthM: 1.5,
  heightM: 1.2,
  sillHeightM: 0.9,
};
