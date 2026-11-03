import assert from "node:assert/strict";
import test from "node:test";
import { fixtureClearsObstacles, fixturesOverlap } from "@/lib/public-wizard/obstacles";
import { placeFixturesWithLayoutInfo } from "@/lib/public-wizard/placement";
import { usePublicWizardStore } from "@/lib/public-wizard/store";
import type { PublicObstacle } from "@/types/public-wizard";

const room=[{x:0,y:0},{x:1000,y:0},{x:1000,y:800},{x:0,y:800}];
const column:PublicObstacle={id:"column",kind:"column",center:{x:500,y:400},radiusM:0.4};
const wall:PublicObstacle={id:"wall",kind:"wall",start:{x:300,y:0},end:{x:300,y:800},thicknessM:0.2};

test("panel footprints, circles, wall endpoints and diagonal walls all block placement",()=>{
 assert.equal(fixtureClearsObstacles({x:560,y:400},100,"led_panel_4000",0,[column]),false);
 assert.equal(fixtureClearsObstacles({x:610,y:400},100,"led_panel_4000",0,[column]),true);
 assert.equal(fixtureClearsObstacles({x:330,y:250},100,"led_panel_4000",0,[wall]),false);
 const diagonal:PublicObstacle={...wall,start:{x:100,y:100},end:{x:700,y:700}};
 assert.equal(fixtureClearsObstacles({x:400,y:400},100,"led_panel_4000",0,[diagonal]),false);
 assert.equal(fixtureClearsObstacles({x:400,y:150},100,"led_panel_4000",0,[diagonal]),true);
});

test("uploaded concave floor plan covers the side wing and stays free of every obstacle",()=>{
 const vertices=[{x:0,y:0},{x:700,y:0},{x:700,y:400},{x:1000,y:400},{x:1000,y:800},{x:0,y:800}];
 const result=placeFixturesWithLayoutInfo(vertices,100,24,"led_panel_4000",{areaM2:68,targetLux:500,ceilingHeightM:2.7,ceilingType:"grid_600",obstacles:[column,wall]});
 assert.equal(result.fixtures.length,24);
 assert.ok(result.fixtures.some(f=>f.x>750 && f.y>450),"The narrow side wing must receive lighting");
 for(const fixture of result.fixtures) {
  assert.ok(fixtureClearsObstacles(fixture,100,fixture.productId,fixture.rotation,[column,wall]));
  for(const other of result.fixtures) if(other.id!==fixture.id) assert.equal(fixturesOverlap(fixture,other,100),false);
 }
});

test("new obstacles regenerate existing plans and constrain drag, add, duplicate, undo and reset",()=>{
 const store=usePublicWizardStore.getState();store.resetWizard();
 store.selectRoomFunction("workplace_office");store.selectAtmosphere("neutraal");store.selectCeilingType("grid_600");
 assert.ok(store.applyManualDimensions({lengthM:10,widthM:8,ceilingHeightM:2.7}));
 const state=usePublicWizardStore.getState();const fixture=state.fixtures[0]!;
 const obstacle:PublicObstacle={id:"block",kind:"column",center:{x:fixture.x,y:fixture.y},radiusM:0.5};
 state.addObstacle(obstacle);
 const check=()=>{
  const s=usePublicWizardStore.getState();
  for(const f of s.fixtures) assert.ok(fixtureClearsObstacles(f,s.pixelsPerMeter!,f.productId,f.rotation,s.obstacles));
 };
 check();
 const selected=usePublicWizardStore.getState().fixtures[0]!;
 store.moveFixtureByIdWithHistory(selected.id,obstacle.center.x,obstacle.center.y);check();
 store.selectFixture(selected.id);store.duplicateSelectedFixture();check();store.addPanel();check();store.addDownlight();check();store.undo();check();store.redo();check();
 store.resetScaleDependentState();assert.equal(usePublicWizardStore.getState().obstacles.length,0);
 store.resetWizard();
});

test("a column only displaces blocked panels and preserves the surrounding matrix",()=>{
 const context={areaM2:80,targetLux:500,ceilingHeightM:2.7,ceilingType:"grid_600" as const};
 const base=placeFixturesWithLayoutInfo(room,100,20,"led_panel_4000",context);
 const hit=base.fixtures[0]!;
 const obstacle:PublicObstacle={id:"column-on-panel",kind:"column",center:{x:hit.x,y:hit.y},radiusM:0.2};
 const result=placeFixturesWithLayoutInfo(room,100,20,"led_panel_4000",{...context,obstacles:[obstacle]});
 assert.equal(result.fixtures.length,base.fixtures.length);
 const unaffected=base.fixtures.filter(f=>fixtureClearsObstacles(f,100,f.productId,f.rotation,[obstacle]));
 for(const f of unaffected) assert.ok(result.fixtures.some(g=>g.x===f.x && g.y===f.y));
 for(const f of result.fixtures) assert.ok(fixtureClearsObstacles(f,100,f.productId,f.rotation,[obstacle]));
});

test("large slightly skewed uploaded rooms keep one aligned grid instead of scattered panels",()=>{
 const vertices=[{x:0,y:0},{x:1504,y:16},{x:1488,y:960},{x:32,y:944}];
 const result=placeFixturesWithLayoutInfo(vertices,64,96,"led_panel_3000",{areaM2:343.6,targetLux:500,ceilingHeightM:2.7,ceilingType:"grid_600"});
 const axis=(key:"x"|"y")=>[...new Set(result.fixtures.map(f=>Math.round(f[key]*1e4)/1e4))].sort((a,b)=>a-b);
 const xs=axis("x"),ys=axis("y");
 assert.ok(result.fixtures.length>=86 && result.fixtures.length<=110);
 assert.ok(xs.length<=14,`Too many independent X positions: ${xs.length}`);
 assert.ok(ys.length<=12,`Too many independent Y positions: ${ys.length}`);
 for(const values of [xs,ys]) {
   const step=Math.min(...values.slice(1).map((v,i)=>v-values[i]!));
   for(const value of values) assert.ok(Math.abs((value-values[0]!)/step-Math.round((value-values[0]!)/step))<1e-4,"Every row and column must share one phase and spacing");
 }
 const rows=ys.map(y=>result.fixtures.filter(f=>Math.abs(f.y-y)<0.01));
 assert.ok(rows.every(row=>row.length>=5),"No isolated panels or isolated staggered rows");
 assert.ok(xs.every(x=>result.fixtures.filter(f=>Math.abs(f.x-x)<0.01).length>=2),"No lone extra column at a skewed boundary");
});

test("walls and round columns remain movable and moved obstacles keep fixtures clear",()=>{
 const store=usePublicWizardStore.getState();store.resetWizard();
 store.selectRoomFunction("workplace_office");store.selectAtmosphere("neutraal");store.selectCeilingType("grid_600");
 store.applyManualDimensions({lengthM:10,widthM:8,ceilingHeightM:2.7});
 const initial=usePublicWizardStore.getState(),ppm=initial.pixelsPerMeter!;
 const anchor=initial.roomVertices[0]!;
 const wall:PublicObstacle={id:"move-wall",kind:"wall",start:{x:anchor.x+ppm,y:anchor.y+ppm},end:{x:anchor.x+4*ppm,y:anchor.y+ppm},thicknessM:0.2};
 store.addObstacle(wall);
 store.moveObstacle(wall.id,ppm,ppm);
 const moved=usePublicWizardStore.getState().obstacles.find(o=>o.id===wall.id)!;
 assert.equal(moved.kind,"wall");
 if(moved.kind!=="wall") throw new Error("wall type changed");
 assert.equal(moved.start.x,wall.start.x+ppm);assert.equal(moved.start.y,wall.start.y+ppm);
 assert.equal(moved.end.x-moved.start.x,wall.end.x-wall.start.x);
 assert.equal(moved.thicknessM,wall.thicknessM);
 const column:PublicObstacle={id:"move-column",kind:"column",center:{x:anchor.x+5*ppm,y:anchor.y+5*ppm},radiusM:0.3};
 store.addObstacle(column);store.moveObstacle(column.id,-ppm,0);
 const shifted=usePublicWizardStore.getState().obstacles.find(o=>o.id===column.id)!;
 assert.ok(shifted.kind==="column" && shifted.center.x===column.center.x-ppm);
 const state=usePublicWizardStore.getState();
 for(const f of state.fixtures) assert.ok(fixtureClearsObstacles(f,ppm,f.productId,f.rotation,state.obstacles));
 store.moveObstacle(wall.id,Infinity,0);
 assert.deepEqual(usePublicWizardStore.getState().obstacles,state.obstacles);
 store.resetWizard();
});
