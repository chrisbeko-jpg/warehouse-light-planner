"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();
import { buildCeilingRaster } from "@/lib/public-wizard/ceiling-raster";
import { getPublicProduct } from "@/lib/public-wizard/products";
import { orientedFixtureSizeM } from "@/lib/public-wizard/placement-constraints";
import {
  canvasPointToFloorM,
  floorPolygonM,
  makeRoom3DOrigin,
  wallSegmentsM,
  wallRotationY,
  type WallSegmentM,
} from "@/lib/public-wizard/room3d-coords";
import type { Point2D } from "@/types/floor-plan";
import type {
  CeilingTypeId,
  PlacedPublicFixture,
  PublicObstacle,
  Room3DSettings,
  Room3DWindow,
} from "@/types/public-wizard";
import { createParquetTexture } from "@/components/public-wizard/room3d/floor-textures";

const MAX_VISUAL_LIGHTS = 8;

function WallMeshes({
  walls,
  ceilingHeightM,
  wallColor,
  windows,
}: {
  walls: WallSegmentM[];
  ceilingHeightM: number;
  wallColor: string;
  windows: Room3DWindow[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    groupRef.current?.children.forEach((group, i) => {
      const wall = walls[i];
      if (!wall) return;
      const dx = camera.position.x - (wall.start.x + wall.end.x) / 2;
      const dz = camera.position.z - (wall.start.z + wall.end.z) / 2;
      // Cut away only the walls between the viewer and the room interior.
      group.visible = dx * wall.normalX + dz * wall.normalZ <= 0.02;
    });
  });
  return (
    <group ref={groupRef}>
      {walls.map((wall) => {
        const midX = (wall.start.x + wall.end.x) / 2;
        const midZ = (wall.start.z + wall.end.z) / 2;
        const angle = wallRotationY(wall);
        const wallWindows = windows.filter((w) => w.wallIndex === wall.index);
        return (
          <group key={wall.index} position={[midX, ceilingHeightM / 2, midZ]} rotation={[0, angle, 0]}>
            <mesh>
              <boxGeometry args={[wall.lengthM, ceilingHeightM, 0.08]} />
              <meshStandardMaterial
                color={wallColor}
              />
            </mesh>
            {wallWindows.map((win) => {
              const cx = -wall.lengthM / 2 + win.offsetAlongWallM + win.widthM / 2;
              const cy = win.sillHeightM + win.heightM / 2 - ceilingHeightM / 2;
              return (
                <mesh key={win.id} position={[cx, cy, 0.05]}>
                  <boxGeometry args={[win.widthM, win.heightM, 0.04]} />
                  <meshPhysicalMaterial
                    color="#93c5fd"
                    transmission={0.65}
                    roughness={0.15}
                    thickness={0.05}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function FixtureMeshes({
  fixtures,
  origin,
  ceilingHeightM,
}: {
  fixtures: PlacedPublicFixture[];
  origin: ReturnType<typeof makeRoom3DOrigin>;
  ceilingHeightM: number;
}) {
  return (
    <group>
      {fixtures.map((fixture) => {
        const product = getPublicProduct(fixture.productId);
        const { x, z } = canvasPointToFloorM(fixture, origin);
        const { widthM, heightM } = orientedFixtureSizeM(fixture.productId, 0);
        const rotY = -((fixture.rotation ?? 0) * Math.PI) / 180;
        const warm = product.cct <= 3500;
        const emissive = warm ? "#ffd8a8" : "#f5f5ff";
        const isDownlight = product.category === "downlight";
        const isSurface = product.mounting === "surface";
        const y =
          isSurface && product.category === "led_panel"
            ? ceilingHeightM - 0.08
            : ceilingHeightM - (isDownlight ? 0.02 : 0.015);

        if (isDownlight) {
          const d = product.diameterM ?? 0.22;
          return (
            <mesh key={fixture.id} position={[x, y, z]}>
              <cylinderGeometry args={[d / 2, d / 2, 0.04, 24]} />
              <meshStandardMaterial color="#f8fafc" emissive={emissive} emissiveIntensity={0.85} />
            </mesh>
          );
        }

        return (
          <mesh key={fixture.id} position={[x, y, z]} rotation={[0, rotY, 0]}>
            <boxGeometry args={[widthM, isSurface ? 0.06 : 0.02, heightM]} />
            <meshStandardMaterial color="#fafafa" emissive={emissive} emissiveIntensity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function CeilingGrid({
  vertices,
  pixelsPerMeter,
  ceilingType,
  ceilingHeightM,
  ceilingColor,
}: {
  vertices: Point2D[];
  pixelsPerMeter: number;
  ceilingType: CeilingTypeId;
  ceilingHeightM: number;
  ceilingColor: string;
}) {
  const raster = useMemo(
    () => buildCeilingRaster(vertices, pixelsPerMeter, ceilingType),
    [vertices, pixelsPerMeter, ceilingType],
  );
  const origin = useMemo(
    () => makeRoom3DOrigin(vertices, pixelsPerMeter),
    [vertices, pixelsPerMeter],
  );

  const lines = useMemo(() => {
    return raster.segments.map((seg) => {
      const a = canvasPointToFloorM({ x: seg.x1, y: seg.y1 }, origin);
      const b = canvasPointToFloorM({ x: seg.x2, y: seg.y2 }, origin);
      return [
        [a.x, ceilingHeightM - 0.01, a.z] as [number, number, number],
        [b.x, ceilingHeightM - 0.01, b.z] as [number, number, number],
      ];
    });
  }, [raster.segments, origin, ceilingHeightM]);

  const floorShape = useMemo(() => {
    const pts = floorPolygonM(vertices, origin);
    const shape = new THREE.Shape();
    pts.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, p.z);
      else shape.lineTo(p.x, p.z);
    });
    shape.closePath();
    return shape;
  }, [vertices, origin]);

  const ceilingGeo = useMemo(() => {
    const geo = new THREE.ShapeGeometry(floorShape);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [floorShape]);

  const rasterGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(lines.flat(2), 3));
    return geometry;
  }, [lines]);

  return (
    <group>
      <mesh geometry={ceilingGeo} position={[0, ceilingHeightM, 0]}>
        {/* Normal faces down: the room side is a closed ceiling. */}
        <meshStandardMaterial color={ceilingColor} side={THREE.FrontSide} />
      </mesh>
      <mesh geometry={ceilingGeo} position={[0, ceilingHeightM, 0]}>
        {/* The top side is always transparent, without a visitor setting. */}
        <meshStandardMaterial color={ceilingColor} side={THREE.BackSide} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <lineSegments geometry={rasterGeometry}>
        <lineBasicMaterial color="#64748b" />
      </lineSegments>
    </group>
  );
}

function FloorMesh({
  vertices,
  origin,
  floor,
}: {
  vertices: Point2D[];
  origin: ReturnType<typeof makeRoom3DOrigin>;
  floor: Room3DSettings["floor"];
}) {
  const shape = useMemo(() => {
    const pts = floorPolygonM(vertices, origin);
    const s = new THREE.Shape();
    pts.forEach((p, i) => {
      if (i === 0) s.moveTo(p.x, -p.z);
      else s.lineTo(p.x, -p.z);
    });
    s.closePath();
    return s;
  }, [vertices, origin]);

  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [shape]);

  const parquet = useMemo(() => (floor.type === "parquet" ? createParquetTexture() : null), [floor.type]);

  const roughness = floor.type === "resin" ? 0.25 : 0.92;
  const metalness = floor.type === "resin" ? 0.08 : 0;

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial
        color={floor.color}
        map={parquet ?? undefined}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}

function SpotLights({
  fixtures,
  origin,
  ceilingHeightM,
}: {
  fixtures: PlacedPublicFixture[];
  origin: ReturnType<typeof makeRoom3DOrigin>;
  ceilingHeightM: number;
}) {
  const lights = useMemo(() => Array.from(
    {length:Math.min(MAX_VISUAL_LIGHTS,fixtures.length)},
    (_,index)=>fixtures[Math.floor(index*fixtures.length/Math.min(MAX_VISUAL_LIGHTS,fixtures.length))]!,
  ).map(fixture => {
    const product = getPublicProduct(fixture.productId);
    const position = canvasPointToFloorM(fixture, origin);
    const target = new THREE.Object3D();
    target.position.set(position.x, 0, position.z);
    return { fixture, product, position, target };
  }), [fixtures, origin]);
  return <group>{lights.map(({fixture, product, position, target}) => {
    const color = product.cct <= 3500 ? "#ffe4c4" : "#f0f4ff";
    if (product.category === "led_panel") return <rectAreaLight key={fixture.id}
      position={[position.x,ceilingHeightM-0.04,position.z]}
      rotation={[-Math.PI/2,0,(fixture.rotation??0)*Math.PI/180]}
      width={product.widthM} height={product.heightM} intensity={3} color={color} />;
    return <group key={fixture.id}><primitive object={target} /><spotLight
      position={[position.x,ceilingHeightM-0.05,position.z]} target={target}
      angle={0.85} penumbra={0.8} intensity={0.4} color={color}
      distance={ceilingHeightM*2.2} castShadow={false} /></group>;
  })}</group>;
}

function ObstacleMeshes({
  obstacles,
  origin,
  height,
}: {
  obstacles: PublicObstacle[];
  origin: ReturnType<typeof makeRoom3DOrigin>;
  height: number;
}) {
  return (
    <group>
      {obstacles.map((o) => {
        if (o.kind === "column") {
          const p = canvasPointToFloorM(o.center, origin);
          return (
            <mesh key={o.id} position={[p.x, height / 2, p.z]}>
              <cylinderGeometry args={[o.radiusM, o.radiusM, height, 32]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
          );
        }
        if (o.kind === "rect") {
          const p = canvasPointToFloorM(o.center, origin);
          return (
            <mesh
              key={o.id}
              position={[p.x, height / 2, p.z]}
              rotation={[0, ((o.rotation ?? 0) * Math.PI) / 180, 0]}
            >
              <boxGeometry args={[o.widthM, height, o.lengthM]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          );
        }
        const start = canvasPointToFloorM(o.start, origin);
        const end = canvasPointToFloorM(o.end, origin);
        return (
          <mesh
            key={o.id}
            position={[(start.x + end.x) / 2, height / 2, (start.z + end.z) / 2]}
            rotation={[0, wallRotationY({ start, end }), 0]}
          >
            <boxGeometry args={[Math.hypot(end.x - start.x, end.z - start.z), height, o.thicknessM]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        );
      })}
    </group>
  );
}

export interface Room3DSceneProps {
  vertices: Point2D[];
  pixelsPerMeter: number;
  ceilingHeightM: number;
  ceilingType: CeilingTypeId;
  fixtures: PlacedPublicFixture[];
  room3D: Room3DSettings;
  obstacles?: PublicObstacle[];
}

export function Room3DScene({
  vertices,
  pixelsPerMeter,
  ceilingHeightM,
  ceilingType,
  fixtures,
  room3D,
  obstacles = [],
}: Room3DSceneProps) {
  const origin = useMemo(
    () => makeRoom3DOrigin(vertices, pixelsPerMeter),
    [vertices, pixelsPerMeter],
  );
  const walls = useMemo(() => wallSegmentsM(vertices, origin), [vertices, origin]);

  return (
    <>
      <color attach="background" args={["#1e293b"]} />
      <ambientLight intensity={room3D.dayLightEnabled ? 0.55 : 0.35} />
      <directionalLight
        position={[5, 8, 3]}
        intensity={room3D.dayLightEnabled ? 0.9 : 0.25}
        color={room3D.dayLightEnabled ? "#e0f2fe" : "#ffffff"}
      />
      <FloorMesh vertices={vertices} origin={origin} floor={room3D.floor} />
      <WallMeshes
        walls={walls}
        ceilingHeightM={ceilingHeightM}
        wallColor={room3D.wallColor}
        windows={room3D.windows}
      />
      <CeilingGrid
        vertices={vertices}
        pixelsPerMeter={pixelsPerMeter}
        ceilingType={ceilingType}
        ceilingHeightM={ceilingHeightM}
        ceilingColor={room3D.ceilingColor}
      />
      <ObstacleMeshes obstacles={obstacles} origin={origin} height={ceilingHeightM} />
      <FixtureMeshes fixtures={fixtures} origin={origin} ceilingHeightM={ceilingHeightM} />
      <SpotLights fixtures={fixtures} origin={origin} ceilingHeightM={ceilingHeightM} />
    </>
  );
}
