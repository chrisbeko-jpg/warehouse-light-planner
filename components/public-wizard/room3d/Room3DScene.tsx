"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { buildCeilingRaster } from "@/lib/public-wizard/ceiling-raster";
import { getPublicProduct } from "@/lib/public-wizard/products";
import { orientedFixtureSizeM } from "@/lib/public-wizard/placement-constraints";
import {
  canvasPointToFloorM,
  floorPolygonM,
  makeRoom3DOrigin,
  wallSegmentsM,
  type WallSegmentM,
} from "@/lib/public-wizard/room3d-coords";
import type { Point2D } from "@/types/floor-plan";
import type {
  CeilingTypeId,
  PlacedPublicFixture,
  Room3DSettings,
  Room3DWindow,
} from "@/types/public-wizard";
import { createParquetTexture } from "@/components/public-wizard/room3d/floor-textures";

const MAX_SPOT_LIGHTS = 28;

function wallAngleY(start: { x: number; z: number }, end: { x: number; z: number }) {
  return Math.atan2(end.x - start.x, end.z - start.z);
}

function WallMeshes({
  walls,
  ceilingHeightM,
  wallColor,
  windows,
  ghostFrontWallIndices,
}: {
  walls: WallSegmentM[];
  ceilingHeightM: number;
  wallColor: string;
  windows: Room3DWindow[];
  ghostFrontWallIndices: Set<number>;
}) {
  return (
    <group>
      {walls.map((wall) => {
        const midX = (wall.start.x + wall.end.x) / 2;
        const midZ = (wall.start.z + wall.end.z) / 2;
        const angle = wallAngleY(wall.start, wall.end);
        const opacity = ghostFrontWallIndices.has(wall.index) ? 0.12 : 1;
        const wallWindows = windows.filter((w) => w.wallIndex === wall.index);
        return (
          <group key={wall.index} position={[midX, ceilingHeightM / 2, midZ]} rotation={[0, angle, 0]}>
            <mesh>
              <boxGeometry args={[wall.lengthM, ceilingHeightM, 0.08]} />
              <meshStandardMaterial
                color={wallColor}
                transparent={opacity < 1}
                opacity={opacity}
                depthWrite={opacity >= 1}
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
        const { widthM, heightM } = orientedFixtureSizeM(fixture.productId, fixture.rotation ?? 0);
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
            <mesh key={fixture.id} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
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
  showCeiling,
  ceilingColor,
}: {
  vertices: Point2D[];
  pixelsPerMeter: number;
  ceilingType: CeilingTypeId;
  ceilingHeightM: number;
  showCeiling: boolean;
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

  return (
    <group>
      {showCeiling && (
        <mesh geometry={ceilingGeo} position={[0, ceilingHeightM, 0]}>
          <meshStandardMaterial color={ceilingColor} side={THREE.DoubleSide} />
        </mesh>
      )}
      {lines.map((points, index) => (
        <Line key={index} points={points} color="#64748b" lineWidth={1} />
      ))}
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
      if (i === 0) s.moveTo(p.x, p.z);
      else s.lineTo(p.x, p.z);
    });
    s.closePath();
    return s;
  }, [vertices, origin]);

  const geo = useMemo(() => {
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(Math.PI / 2);
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
  const subset = fixtures.slice(0, MAX_SPOT_LIGHTS);
  return (
    <group>
      {subset.map((fixture) => {
        const product = getPublicProduct(fixture.productId);
        const { x, z } = canvasPointToFloorM(fixture, origin);
        const warm = product.cct <= 3500;
        return (
          <spotLight
            key={`light-${fixture.id}`}
            position={[x, ceilingHeightM - 0.05, z]}
            angle={0.65}
            penumbra={0.45}
            intensity={warm ? 0.35 : 0.42}
            color={warm ? "#ffe4c4" : "#f0f4ff"}
            distance={ceilingHeightM * 2.2}
            castShadow={false}
          />
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
  ghostFrontWallIndices: Set<number>;
}

export function Room3DScene({
  vertices,
  pixelsPerMeter,
  ceilingHeightM,
  ceilingType,
  fixtures,
  room3D,
  ghostFrontWallIndices,
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
        ghostFrontWallIndices={ghostFrontWallIndices}
      />
      <CeilingGrid
        vertices={vertices}
        pixelsPerMeter={pixelsPerMeter}
        ceilingType={ceilingType}
        ceilingHeightM={ceilingHeightM}
        showCeiling={room3D.showCeiling}
        ceilingColor={room3D.ceilingColor}
      />
      <FixtureMeshes fixtures={fixtures} origin={origin} ceilingHeightM={ceilingHeightM} />
      <SpotLights fixtures={fixtures} origin={origin} ceilingHeightM={ceilingHeightM} />
    </>
  );
}
