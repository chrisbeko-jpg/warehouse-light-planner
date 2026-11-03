import { listModuleSnapCenters } from "@/lib/public-wizard/room-ceiling-grid";
import { isFixtureCenterValid, orientedFixtureSizeM } from "@/lib/public-wizard/placement-constraints";
import { fixtureClearsObstacles } from "@/lib/public-wizard/obstacles";
import { panelRotationForRoom } from "@/lib/public-wizard/matrix-placement";
import { isElongatedPanel } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId, PlacedPublicFixture, PublicObstacle, PublicProductId } from "@/types/public-wizard";

/** One regular lattice, clipped to the usable room. Never stagger individual rows or points. */
export function placeInUsableArea(
  vertices: Point2D[], ppm: number, count: number, productId: PublicProductId,
  ceilingType: CeilingTypeId, obstacles: PublicObstacle[],
): PlacedPublicFixture[] {
  if (count <= 0 || vertices.length < 3 || ppm <= 0) return [];
  const xs = vertices.map(p => p.x), ys = vertices.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX-minX, height = maxY-minY;
  const rotation = isElongatedPanel(productId)
    ? panelRotationForRoom(width/ppm,height/ppm,productId) : 0;
  const candidates = listModuleSnapCenters(vertices,ppm,ceilingType,productId,rotation).filter(p =>
    isFixtureCenterValid(p,ppm,vertices,productId,rotation,{enforceWallClearance:false}) &&
    fixtureClearsObstacles(p,ppm,productId,rotation,obstacles));
  if (!candidates.length) return [];
  const uniqueAxis = (values:number[]) => [...new Set(values.map(v => Math.round(v*1e5)/1e5))].sort((a,b) => a-b);
  const xAxis = uniqueAxis(candidates.map(p => p.x)), yAxis = uniqueAxis(candidates.map(p => p.y));
  const spacing = (axis:number[]) => axis.length < 2 ? 0.6*ppm : Math.min(...axis.slice(1).map((v,i) => v-axis[i]!));
  const dx = spacing(xAxis), dy = spacing(yAxis);
  const indexed = candidates.map(p => ({...p,col:Math.round((p.x-xAxis[0]!)/dx),row:Math.round((p.y-yAxis[0]!)/dy)}));
  const size = orientedFixtureSizeM(productId,rotation);
  const minStepX = Math.max(1,Math.ceil((Math.max(1.2,size.widthM+0.05)*ppm-1e-4)/dx));
  const minStepY = Math.max(1,Math.ceil((Math.max(1.2,size.heightM+0.05)*ppm-1e-4)/dy));
  const maxStepX = Math.max(minStepX,Math.min(16,xAxis.length));
  const maxStepY = Math.max(minStepY,Math.min(16,yAxis.length));
  const shortlist:Array<{points:Point2D[];score:number;stepX:number;stepY:number}> = [];
  for (let sx=minStepX;sx<=maxStepX;sx++) {
    for (let sy=minStepY;sy<=maxStepY;sy++) {
      const buckets = new Map<number,Point2D[]>();
      for (const p of indexed) {
        const key = (p.col%sx)*sy+(p.row%sy);
        const bucket = buckets.get(key);
        if (bucket) bucket.push(p); else buckets.set(key,[p]);
      }
      for (const rawPoints of buckets.values()) {
        // A slanted boundary must not leave a lone extra fixture beyond all other rows.
        const rowCounts = new Map<number,number>(), colCounts = new Map<number,number>();
        for (const p of rawPoints) {
          rowCounts.set(p.y,(rowCounts.get(p.y) ?? 0)+1);
          colCounts.set(p.x,(colCounts.get(p.x) ?? 0)+1);
        }
        const points = count < 6 ? rawPoints : rawPoints.filter(p =>
          (rowCounts.get(p.y) ?? 0)>1 && (colCounts.get(p.x) ?? 0)>1);
        const n = points.length;
        if (!n || n > Math.max(count+4,count*1.3)) continue;
        const x = points.map(p=>p.x), y = points.map(p=>p.y);
        const left = Math.min(...x)-minX, right = maxX-Math.max(...x);
        const top = Math.min(...y)-minY, bottom = maxY-Math.max(...y);
        // Prefer the requested count, near-square spacing and balanced half-bay perimeter margins.
        const deficit = Math.max(0,count-n), excess = Math.max(0,n-count);
        let score = -(deficit*1.3+excess)*1000/Math.max(1,count);
        score -= Math.abs(Math.log((sx*dx)/(sy*dy)))*90;
        score -= (Math.abs(left-right)/Math.max(width,1)+Math.abs(top-bottom)/Math.max(height,1))*120;
        score -= (Math.abs((left+right)/2-sx*dx/2)/Math.max(width,1)+Math.abs((top+bottom)/2-sy*dy/2)/Math.max(height,1))*80;
        shortlist.push({points,score,stepX:sx*dx,stepY:sy*dy});
      }
    }
  }
  shortlist.sort((a,b)=>b.score-a.score);
  let best:Point2D[] = [], bestScore = -Infinity;
  // Assess coverage only for the strongest regular patterns, including small wings of L-shaped rooms.
  const samples = candidates.filter((_,i)=>i%Math.max(1,Math.ceil(candidates.length/800))===0);
  for (const layout of shortlist.slice(0,24)) {
    const cellSize2 = layout.stepX*layout.stepX+layout.stepY*layout.stepY;
    let meanDistance2=0,worstDistance2=0;
    for (const p of samples) {
      let nearest=Infinity;
      for (const q of layout.points) nearest=Math.min(nearest,(p.x-q.x)**2+(p.y-q.y)**2);
      meanDistance2+=nearest; worstDistance2=Math.max(worstDistance2,nearest);
    }
    const score = layout.score - 60*(meanDistance2/Math.max(1,samples.length))/cellSize2 - 45*worstDistance2/cellSize2;
    if (score>bestScore) {bestScore=score;best=layout.points;}
  }
  const stamp=Date.now();
  return best.map((p, index) => ({
    id: `fx-grid-${stamp}-${index}`,
    productId,
    x: p.x,
    y: p.y,
    rotation,
  }));
}
