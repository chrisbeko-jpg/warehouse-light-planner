import type { Point2D } from "@/types/floor-plan";
import type { PlacedPublicFixture, PublicObstacle, PublicProductId } from "@/types/public-wizard";
import { getPublicProduct } from "@/lib/public-wizard/products";

export const OBSTACLE_CLEARANCE_M = 0.15;

function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 ? Math.max(0, Math.min(1, ((p.x-a.x)*dx + (p.y-a.y)*dy)/length2)) : 0;
  return Math.hypot(p.x-a.x-t*dx, p.y-a.y-t*dy);
}

/** Segment against an axis-aligned rectangle, including endpoints inside it. */
function crossesBox(a: Point2D, b: Point2D, left: number, top: number, right: number, bottom: number): boolean {
  let low = 0, high = 1;
  for (const [start, delta, min, max] of [[a.x,b.x-a.x,left,right], [a.y,b.y-a.y,top,bottom]]) {
    if (Math.abs(delta!) < 1e-10) { if (start! < min! || start! > max!) return false; }
    else {
      let t0 = (min!-start!)/delta!, t1 = (max!-start!)/delta!;
      if (t0 > t1) [t0,t1] = [t1,t0];
      low = Math.max(low,t0); high = Math.min(high,t1);
      if (low > high) return false;
    }
  }
  return true;
}

export function fixtureClearsObstacles(
  center: Point2D, ppm: number, productId: PublicProductId, rotation: number,
  obstacles: PublicObstacle[] = [],
): boolean {
  const p = getPublicProduct(productId);
  const turned = Math.abs(Math.round(rotation/90)) % 2 === 1;
  const halfX = (p.diameterM ?? (turned ? p.heightM : p.widthM)) * ppm / 2;
  const halfY = (p.diameterM ?? (turned ? p.widthM : p.heightM)) * ppm / 2;
  const left = center.x-halfX, right = center.x+halfX, top = center.y-halfY, bottom = center.y+halfY;
  const clearance = OBSTACLE_CLEARANCE_M * ppm;
  return obstacles.every((o) => {
    if (o.kind === "column") {
      const dx = Math.max(left-o.center.x, 0, o.center.x-right);
      const dy = Math.max(top-o.center.y, 0, o.center.y-bottom);
      return Math.hypot(dx,dy) > o.radiusM*ppm + clearance;
    }
    if (o.kind === "rect") {
      const halfW = (o.widthM / 2) * ppm;
      const halfL = (o.lengthM / 2) * ppm;
      const rad = ((o.rotation ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const corners = [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];
      for (const c of corners) {
        const lx = c.x - o.center.x;
        const ly = c.y - o.center.y;
        const rx = lx * cos + ly * sin;
        const ry = -lx * sin + ly * cos;
        if (Math.abs(rx) <= halfW + clearance && Math.abs(ry) <= halfL + clearance) return false;
      }
      const cx = o.center.x;
      const cy = o.center.y;
      const lx = cx - o.center.x;
      const ly = cy - o.center.y;
      const rx = lx * cos + ly * sin;
      const ry = -lx * sin + ly * cos;
      if (Math.abs(rx) <= halfW + clearance && Math.abs(ry) <= halfL + clearance) return false;
      return true;
    }
    if (crossesBox(o.start,o.end,left,top,right,bottom)) return false;
    const corners = [{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}];
    const toBox = (p: Point2D) => Math.hypot(Math.max(left-p.x,0,p.x-right),Math.max(top-p.y,0,p.y-bottom));
    const distance = Math.min(toBox(o.start),toBox(o.end),...corners.map(c => distanceToSegment(c,o.start,o.end)));
    return distance > o.thicknessM*ppm/2 + clearance;
  });
}

export function fixturesOverlap(a: PlacedPublicFixture, b: PlacedPublicFixture, ppm: number): boolean {
  const sizes = (f: PlacedPublicFixture) => {
    const p = getPublicProduct(f.productId);
    const turn = Math.abs(Math.round(f.rotation/90))%2;
    return { x:(p.diameterM ?? (turn?p.heightM:p.widthM))*ppm, y:(p.diameterM ?? (turn?p.widthM:p.heightM))*ppm };
  };
  const sa=sizes(a), sb=sizes(b);
  return Math.abs(a.x-b.x)<(sa.x+sb.x)/2-1e-6 && Math.abs(a.y-b.y)<(sa.y+sb.y)/2-1e-6;
}
