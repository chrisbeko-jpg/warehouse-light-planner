import assert from "node:assert/strict";
import test from "node:test";
import { buildManualRoomScene } from "@/lib/public-wizard/manual-room";
import {
  canvasPointToFloorM,
  clampWindowOnWall,
  fixtureFloorPositionM,
  makeRoom3DOrigin,
  roomAxisBoundsM,
  validateWindowOnWall,
  wallSegmentsM,
  wallRotationY,
  windowsOverlap,
} from "@/lib/public-wizard/room3d-coords";

test("8×5 manual room maps fixtures to expected floor meters", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 5 });
  const origin = makeRoom3DOrigin(scene.vertices, scene.pixelsPerMeter);
  const bounds = roomAxisBoundsM(scene.vertices, origin);
  assert.ok(Math.abs(bounds.spanX - 8) < 0.02);
  assert.ok(Math.abs(bounds.spanZ - 5) < 0.02);
  const corner = canvasPointToFloorM(scene.vertices[0]!, origin);
  assert.ok(Math.abs(corner.x) < 0.02);
  assert.ok(Math.abs(corner.z) < 0.02);
});

test("fixture center matches 2D canvas conversion", () => {
  const scene = buildManualRoomScene({ lengthM: 4, widthM: 3 });
  const origin = makeRoom3DOrigin(scene.vertices, scene.pixelsPerMeter);
  const centerPx = {
    x: scene.vertices[0]!.x + 2 * scene.pixelsPerMeter,
    y: scene.vertices[0]!.y + 1.5 * scene.pixelsPerMeter,
  };
  const pos = fixtureFloorPositionM(centerPx, origin);
  assert.ok(Math.abs(pos.x - 2) < 0.02);
  assert.ok(Math.abs(pos.z - 1.5) < 0.02);
});

test("windows cannot overlap on the same wall", () => {
  const a = {
    id: "a",
    wallIndex: 0,
    offsetAlongWallM: 0.5,
    widthM: 1.5,
    heightM: 1.2,
    sillHeightM: 0.9,
  };
  const b = { ...a, id: "b", offsetAlongWallM: 1.6 };
  assert.equal(windowsOverlap(a, b), true);
  const c = { ...a, id: "c", offsetAlongWallM: 2.2 };
  assert.equal(windowsOverlap(a, c), false);
});

test("validateWindowOnWall clamps offset inside wall span", () => {
  const scene = buildManualRoomScene({ lengthM: 8, widthM: 5 });
  const origin = makeRoom3DOrigin(scene.vertices, scene.pixelsPerMeter);
  const walls = wallSegmentsM(scene.vertices, origin);
  const longWall = walls.reduce((best, w) => (w.lengthM > best.lengthM ? w : best), walls[0]!);
  const clamped = clampWindowOnWall(
    { wallIndex: longWall.index, offsetAlongWallM: 99, widthM: 1.5 },
    longWall,
  );
  assert.ok(clamped < 99);
  const validated = validateWindowOnWall(
    {
      id: "w1",
      wallIndex: longWall.index,
      offsetAlongWallM: clamped,
      widthM: 1.5,
      heightM: 1.2,
      sillHeightM: 0.9,
    },
    walls,
    [],
  );
  assert.ok(validated);
});

test("3D wall endpoints match an irregular drawn room in both winding orders", () => {
  const polygon = [{x: 0,y: 0}, {x: 800,y: 0}, {x: 800,y: 300}, {x: 400,y: 300}, {x: 300,y: 500}, {x: 0,y: 500}];
  for (const vertices of [polygon, [...polygon].reverse()]) {
    const walls = wallSegmentsM(vertices, makeRoom3DOrigin(vertices, 100));
    for (const wall of walls) {
      const angle = wallRotationY(wall);
      assert.ok(Math.abs(Math.cos(angle) * wall.lengthM - (wall.end.x - wall.start.x)) < 1e-8);
      assert.ok(Math.abs(-Math.sin(angle) * wall.lengthM - (wall.end.z - wall.start.z)) < 1e-8);
    }
    const top = walls.find(w => w.start.z === 0 && w.end.z === 0)!;
    assert.equal(top.normalZ, -1);
  }
});
