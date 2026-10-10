import { ceilingCellSizeM } from "@/lib/public-wizard/ceiling-raster";
import {
  minDistanceToPolygonBoundaryM,
  orientedFixtureSizeM,
} from "@/lib/public-wizard/placement-constraints";
import { pointInPolygon } from "@/lib/public-wizard/placement";
import { getPublicProduct, isElongatedPanel } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId, PublicProductId } from "@/types/public-wizard";

/** Single source of truth for ceiling module geometry in a rectangular room. */
export interface RoomCeilingGrid {
  helper: boolean;
  ceilingType: CeilingTypeId;
  pixelsPerMeter: number;
  roomMinX: number;
  roomMinY: number;
  roomWidthM: number;
  roomHeightM: number;
  cellWidthM: number;
  cellHeightM: number;
  /** Distance from room min corner to the first module edge (metres). */
  offsetXM: number;
  offsetYM: number;
  cols: number;
  rows: number;
}

export interface ModuleIndex {
  col: number;
  row: number;
}

function polygonBounds(vertices: Point2D[]) {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export function buildRoomCeilingGrid(
  vertices: Point2D[],
  pixelsPerMeter: number,
  ceilingType: CeilingTypeId,
): RoomCeilingGrid | null {
  if (vertices.length < 3 || pixelsPerMeter <= 0) return null;
  const bounds = polygonBounds(vertices);
  const roomWidthM = (bounds.maxX - bounds.minX) / pixelsPerMeter;
  const roomHeightM = (bounds.maxY - bounds.minY) / pixelsPerMeter;
  const cells = ceilingCellSizeM(ceilingType, roomWidthM, roomHeightM);
  const cols = Math.floor((roomWidthM + 1e-6) / cells.cellWidthM);
  const rows = Math.floor((roomHeightM + 1e-6) / cells.cellHeightM);
  if (cols < 1 || rows < 1) return null;
  return {
    helper: cells.helper,
    ceilingType,
    pixelsPerMeter,
    roomMinX: bounds.minX,
    roomMinY: bounds.minY,
    roomWidthM,
    roomHeightM,
    cellWidthM: cells.cellWidthM,
    cellHeightM: cells.cellHeightM,
    offsetXM: (roomWidthM - cols * cells.cellWidthM) / 2,
    offsetYM: (roomHeightM - rows * cells.cellHeightM) / 2,
    cols,
    rows,
  };
}

export function moduleLeftTopM(grid: RoomCeilingGrid, col: number, row: number): { leftM: number; topM: number } {
  return {
    leftM: grid.offsetXM + col * grid.cellWidthM,
    topM: grid.offsetYM + row * grid.cellHeightM,
  };
}

export function moduleBoundsM(
  grid: RoomCeilingGrid,
  col: number,
  row: number,
): { leftM: number; topM: number; rightM: number; bottomM: number } {
  const { leftM, topM } = moduleLeftTopM(grid, col, row);
  return {
    leftM,
    topM,
    rightM: leftM + grid.cellWidthM,
    bottomM: topM + grid.cellHeightM,
  };
}

export function moduleCenterPx(grid: RoomCeilingGrid, col: number, row: number): Point2D {
  const { leftM, topM } = moduleLeftTopM(grid, col, row);
  return {
    x: grid.roomMinX + (leftM + grid.cellWidthM / 2) * grid.pixelsPerMeter,
    y: grid.roomMinY + (topM + grid.cellHeightM / 2) * grid.pixelsPerMeter,
  };
}

/** Downlights sit at the geometric centre of a full ceiling module. */
export function downlightCenterPx(grid: RoomCeilingGrid, col: number, row: number): Point2D {
  return moduleCenterPx(grid, col, row);
}

/**
 * 1200×300 in a 1200×600 module: full module length, 300 mm depth, flush to module start (top/left).
 */
export function elongatedPanelCenterPx(
  grid: RoomCeilingGrid,
  col: number,
  row: number,
  productId: PublicProductId,
  rotation: number,
): Point2D {
  const { leftM, topM } = moduleLeftTopM(grid, col, row);
  const oriented = orientedFixtureSizeM(productId, rotation);
  let centerLocalXM = leftM;
  let centerLocalYM = topM;

  if (Math.abs(oriented.widthM - grid.cellWidthM) < 1e-4) {
    centerLocalXM += grid.cellWidthM / 2;
    centerLocalYM += oriented.heightM / 2;
  } else if (Math.abs(oriented.heightM - grid.cellHeightM) < 1e-4) {
    centerLocalYM += grid.cellHeightM / 2;
    centerLocalXM += oriented.widthM / 2;
  } else {
    centerLocalXM += grid.cellWidthM / 2;
    centerLocalYM += grid.cellHeightM / 2;
  }

  return {
    x: grid.roomMinX + centerLocalXM * grid.pixelsPerMeter,
    y: grid.roomMinY + centerLocalYM * grid.pixelsPerMeter,
  };
}

/** 600×600 recessed panel: centre equals module centre; render size matches module. */
export function gridPanelCenterPx(grid: RoomCeilingGrid, col: number, row: number): Point2D {
  return moduleCenterPx(grid, col, row);
}

export function fixtureCenterForModule(
  grid: RoomCeilingGrid,
  col: number,
  row: number,
  productId: PublicProductId,
  rotation = 0,
): Point2D {
  const product = getPublicProduct(productId);
  if (product.category === "downlight" && !grid.helper) {
    return downlightCenterPx(grid, col, row);
  }
  if (isElongatedPanel(productId) && !grid.helper) {
    return elongatedPanelCenterPx(grid, col, row, productId, rotation);
  }
  if (product.category === "led_panel" && !grid.helper && grid.ceilingType === "grid_600") {
    return gridPanelCenterPx(grid, col, row);
  }
  return moduleCenterPx(grid, col, row);
}

export function renderSizeMForFixture(
  grid: RoomCeilingGrid,
  productId: PublicProductId,
  rotation = 0,
): { widthM: number; heightM: number } {
  const product = getPublicProduct(productId);
  if (!grid.helper && grid.ceilingType === "grid_600" && product.category === "led_panel" && !isElongatedPanel(productId)) {
    return { widthM: grid.cellWidthM, heightM: grid.cellHeightM };
  }
  return orientedFixtureSizeM(productId, rotation);
}

export function listAllModuleIndices(grid: RoomCeilingGrid): ModuleIndex[] {
  const indices: ModuleIndex[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      indices.push({ col, row });
    }
  }
  return indices;
}

export function nearestModuleIndex(grid: RoomCeilingGrid, xPx: number, yPx: number): ModuleIndex | null {
  const localXM = (xPx - grid.roomMinX) / grid.pixelsPerMeter;
  const localYM = (yPx - grid.roomMinY) / grid.pixelsPerMeter;
  const col = Math.round((localXM - grid.offsetXM - grid.cellWidthM / 2) / grid.cellWidthM);
  const row = Math.round((localYM - grid.offsetYM - grid.cellHeightM / 2) / grid.cellHeightM);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return null;
  return { col, row };
}

export function moduleCornersPx(grid: RoomCeilingGrid, col: number, row: number): Point2D[] {
  const bounds = moduleBoundsM(grid, col, row);
  const ppm = grid.pixelsPerMeter;
  return [
    { x: grid.roomMinX + bounds.leftM * ppm, y: grid.roomMinY + bounds.topM * ppm },
    { x: grid.roomMinX + bounds.rightM * ppm, y: grid.roomMinY + bounds.topM * ppm },
    { x: grid.roomMinX + bounds.rightM * ppm, y: grid.roomMinY + bounds.bottomM * ppm },
    { x: grid.roomMinX + bounds.leftM * ppm, y: grid.roomMinY + bounds.bottomM * ppm },
  ];
}

export function moduleMeetsWallClearanceM(
  grid: RoomCeilingGrid,
  col: number,
  row: number,
  vertices: Point2D[],
  clearanceM: number,
): boolean {
  const corners = moduleCornersPx(grid, col, row);
  for (const corner of corners) {
    if (!pointInPolygon(corner, vertices)) return false;
    if (minDistanceToPolygonBoundaryM(corner, vertices, grid.pixelsPerMeter) < clearanceM - 1e-4) {
      return false;
    }
  }
  const center = moduleCenterPx(grid, col, row);
  return pointInPolygon(center, vertices);
}

export function listModuleSnapCenters(
  vertices: Point2D[],
  pixelsPerMeter: number,
  ceilingType: CeilingTypeId,
  productId: PublicProductId,
  rotation = 0,
): Point2D[] {
  const grid = buildRoomCeilingGrid(vertices, pixelsPerMeter, ceilingType);
  if (!grid) return [];
  const product = getPublicProduct(productId);
  const points: Point2D[] = [];
  for (const { col, row } of listAllModuleIndices(grid)) {
    const center = fixtureCenterForModule(grid, col, row, productId, rotation);
    if (!pointInPolygon(center, vertices)) continue;
    if (product.category === "downlight") {
      points.push(center);
      continue;
    }
    points.push(center);
  }
  return points;
}

export function snapPointToModule(
  grid: RoomCeilingGrid,
  xPx: number,
  yPx: number,
  productId: PublicProductId,
  rotation = 0,
): Point2D | null {
  const index = nearestModuleIndex(grid, xPx, yPx);
  if (!index) return null;
  return fixtureCenterForModule(grid, index.col, index.row, productId, rotation);
}

export function buildRasterSegments(grid: RoomCeilingGrid, roomMaxX: number, roomMaxY: number) {
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const pushVertical = (xPx: number) => {
    segments.push({ x1: xPx, y1: grid.roomMinY, x2: xPx, y2: roomMaxY });
  };
  const pushHorizontal = (yPx: number) => {
    segments.push({ x1: grid.roomMinX, y1: yPx, x2: roomMaxX, y2: yPx });
  };

  for (let col = 0; col <= grid.cols; col++) {
    const leftM = grid.offsetXM + col * grid.cellWidthM;
    pushVertical(grid.roomMinX + leftM * grid.pixelsPerMeter);
  }
  for (let row = 0; row <= grid.rows; row++) {
    const topM = grid.offsetYM + row * grid.cellHeightM;
    pushHorizontal(grid.roomMinY + topM * grid.pixelsPerMeter);
  }
  return segments;
}
