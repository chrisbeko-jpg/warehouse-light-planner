import { listModuleSnapCenters } from "@/lib/public-wizard/room-ceiling-grid";
import { isFixtureCenterValid, orientedFixtureSizeM } from "@/lib/public-wizard/placement-constraints";
import { fixtureClearsObstacles } from "@/lib/public-wizard/obstacles";
import { panelRotationForRoom } from "@/lib/public-wizard/matrix-placement";
import { isElongatedPanel } from "@/lib/public-wizard/products";
import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId, PlacedPublicFixture, PublicObstacle, PublicProductId } from "@/types/public-wizard";

/** Uniform coverage of the actual usable polygon, rather than a clipped bounding-box matrix. */
export function placeInUsableArea(vertices: Point2D[], ppm: number, count: number, productId: PublicProductId,
  ceilingType: CeilingTypeId, obstacles: PublicObstacle[]): PlacedPublicFixture[] {
  if (count <= 0 || vertices.length < 3 || ppm <= 0) return [];
  const xs=vertices.map(p=>p.x), ys=vertices.map(p=>p.y);
  const width=(Math.max(...xs)-Math.min(...xs))/ppm, height=(Math.max(...ys)-Math.min(...ys))/ppm;
  const rotation=isElongatedPanel(productId)?panelRotationForRoom(width,height,productId):0;
  const candidates=listModuleSnapCenters(vertices,ppm,ceilingType,productId,rotation).filter(p =>
    isFixtureCenterValid(p,ppm,vertices,productId,rotation,{enforceWallClearance:false}) &&
    fixtureClearsObstacles(p,ppm,productId,rotation,obstacles));
  if (!candidates.length) return [];
  const make=(p:Point2D,index:number):PlacedPublicFixture=>({...p,productId,rotation,id:`fx-area-${Date.now()}-${index}`});
  const distance2=(a:Point2D,b:Point2D)=>(a.x-b.x)**2+(a.y-b.y)**2;
  const center={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
  let selected:Point2D[]=[candidates.reduce((a,b)=>distance2(a,center)<distance2(b,center)?a:b)];
  // Farthest-point seeds ensure narrow wings are represented as well as the main room.
  const nearest=candidates.map(p=>distance2(p,selected[0]!));
  const size=orientedFixtureSizeM(productId,rotation);
  const compatible=(p:Point2D,points:Point2D[])=>!points.some(q=>Math.abs(p.x-q.x)<size.widthM*ppm-1e-6 && Math.abs(p.y-q.y)<size.heightM*ppm-1e-6);
  while(selected.length < Math.min(count,candidates.length)) {
    let index=-1,best=-1;
    for(let i=0;i<candidates.length;i++) if(nearest[i]!>best && compatible(candidates[i]!,selected)) {index=i;best=nearest[i]!;}
    if(index<0 || best<1e-8) break;
    const chosen=candidates[index]!; selected.push(chosen);
    for(let i=0;i<candidates.length;i++) nearest[i]=Math.min(nearest[i]!,distance2(candidates[i]!,chosen));
  }
  // Snap each coverage cell's centroid back to the ceiling modules; never free-place a panel.
  for(let iteration=0;iteration<8;iteration++) {
    const clusters=selected.map(()=>({x:0,y:0,n:0}));
    for(const p of candidates) {
      let best=0; for(let i=1;i<selected.length;i++) if(distance2(p,selected[i]!)<distance2(p,selected[best]!)) best=i;
      const cell=clusters[best]!;cell.x+=p.x;cell.y+=p.y;cell.n++;
    }
    const next:Point2D[]=[];
    for(let i=0;i<selected.length;i++) {
      const cell=clusters[i]!, centroid=cell.n?{x:cell.x/cell.n,y:cell.y/cell.n}:selected[i]!;
      let best:Point2D|null=null,bestDistance=Infinity;
      for(const p of candidates) {
        const d=distance2(p,centroid);
        if(d<bestDistance && compatible(p,next)) {best=p;bestDistance=d;}
      }
      if(best) next.push(best);
    }
    selected=next;
  }
  return selected.map(make);
}
