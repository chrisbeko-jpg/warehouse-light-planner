"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Room3DScene } from "@/components/public-wizard/room3d/Room3DScene";
import { Room3DSettingsPanel } from "@/components/public-wizard/room3d/Room3DSettingsPanel";
import {
  makeRoom3DOrigin,
  roomAxisBoundsM,
  wallSegmentsM,
} from "@/lib/public-wizard/room3d-coords";
import type { Point2D } from "@/types/floor-plan";
import type { CeilingTypeId, PlacedPublicFixture, Room3DCameraPreset, Room3DSettings } from "@/types/public-wizard";

function CameraRig({
  preset,
  bounds,
  ceilingHeightM,
  controlsRef,
}: {
  preset: Room3DCameraPreset;
  bounds: ReturnType<typeof roomAxisBoundsM>;
  ceilingHeightM: number;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const span = Math.max(bounds.spanX, bounds.spanZ, 2);

  useEffect(() => {
    const target = new THREE.Vector3(bounds.centerX, ceilingHeightM * 0.45, bounds.centerZ);
    let position: THREE.Vector3;
    switch (preset) {
      case "top":
        position = new THREE.Vector3(bounds.centerX, span * 2.2, bounds.centerZ);
        break;
      case "interior":
        position = new THREE.Vector3(
          bounds.centerX + bounds.spanX * 0.15,
          1.6,
          bounds.centerZ + bounds.spanZ * 0.15,
        );
        break;
      case "isometric":
        position = new THREE.Vector3(
          bounds.centerX + span * 1.1,
          ceilingHeightM + span * 0.85,
          bounds.centerZ + span * 1.1,
        );
        break;
      case "fit":
      default:
        position = new THREE.Vector3(
          bounds.centerX + span * 0.9,
          ceilingHeightM + span * 0.65,
          bounds.centerZ + span * 0.9,
        );
        break;
    }
    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  }, [preset, bounds, ceilingHeightM, span, camera, controlsRef]);

  return null;
}

export interface Room3DViewerProps {
  vertices: Point2D[];
  pixelsPerMeter: number;
  ceilingHeightM: number;
  ceilingType: CeilingTypeId;
  fixtures: PlacedPublicFixture[];
  room3D: Room3DSettings;
}

export function Room3DViewer({
  vertices,
  pixelsPerMeter,
  ceilingHeightM,
  ceilingType,
  fixtures,
  room3D,
}: Room3DViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [preset, setPreset] = useState<Room3DCameraPreset>("fit");
  const [panelOpen, setPanelOpen] = useState(true);

  const origin = useMemo(
    () => makeRoom3DOrigin(vertices, pixelsPerMeter),
    [vertices, pixelsPerMeter],
  );
  const bounds = useMemo(() => roomAxisBoundsM(vertices, origin), [vertices, origin]);
  const walls = useMemo(() => wallSegmentsM(vertices, origin), [vertices, origin]);

  const ghostFrontWallIndices = useMemo(() => {
    if (preset !== "isometric") return new Set<number>();
    const set = new Set<number>();
    for (const wall of walls) {
      if (wall.normalZ < -0.2) set.add(wall.index);
      if (wall.normalX < -0.2) set.add(wall.index);
    }
    return set;
  }, [preset, walls]);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "lichtplan-3d.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <div className="relative flex h-full min-h-[320px] w-full flex-col" data-testid="room-3d-viewer">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--lp-border)] bg-white px-3 py-2">
        {(
          [
            ["fit", "Reset camera"],
            ["isometric", "Isometrisch"],
            ["top", "Bovenaanzicht"],
            ["interior", "Binnenaanzicht"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-md border px-2 py-1 text-xs ${
              preset === id ? "border-[var(--lp-primary)] bg-[var(--lp-primary)]/10" : "border-[var(--lp-border)]"
            }`}
            onClick={() => setPreset(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="rounded-md border border-[var(--lp-border)] px-2 py-1 text-xs" onClick={exportPng}>
          3D-afbeelding opslaan
        </button>
        <button
          type="button"
          className="ml-auto rounded-md border border-[var(--lp-border)] px-2 py-1 text-xs lg:hidden"
          onClick={() => setPanelOpen((v) => !v)}
        >
          Instellingen
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <Canvas
          shadows={false}
          dpr={[1, 1.75]}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          camera={{ fov: 50, near: 0.05, far: 200 }}
          onCreated={({ gl }) => {
            canvasRef.current = gl.domElement;
          }}
        >
          <Suspense fallback={null}>
            <CameraRig
              preset={preset}
              bounds={bounds}
              ceilingHeightM={ceilingHeightM}
              controlsRef={controlsRef}
            />
            <Room3DScene
              vertices={vertices}
              pixelsPerMeter={pixelsPerMeter}
              ceilingHeightM={ceilingHeightM}
              ceilingType={ceilingType}
              fixtures={fixtures}
              room3D={room3D}
              ghostFrontWallIndices={ghostFrontWallIndices}
            />
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minDistance={1.2}
              maxDistance={Math.max(bounds.spanX, bounds.spanZ) * 4}
              maxPolarAngle={Math.PI * 0.49}
            />
          </Suspense>
        </Canvas>

        <p className="pointer-events-none absolute bottom-2 left-2 max-w-md rounded bg-black/60 px-2 py-1 text-[10px] text-white sm:text-xs">
          Indicatieve sfeerweergave — geen fotometrische berekening. Lux en materiaaladvies blijven leidend.
        </p>

        {panelOpen && (
          <div className="absolute right-2 top-2 z-10 max-h-[min(70vh,520px)] w-[min(100%,280px)] overflow-y-auto rounded-lg border border-[var(--lp-border)] bg-white/95 p-3 shadow-lg backdrop-blur">
            <Room3DSettingsPanel wallCount={walls.length} />
          </div>
        )}
      </div>
    </div>
  );
}
