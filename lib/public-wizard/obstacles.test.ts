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
