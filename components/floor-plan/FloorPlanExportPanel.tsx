"use client";

import { useRef } from "react";
import {
  downloadFloorPlanJson,
  parseFloorPlanProject,
  serializeFloorPlanProject,
} from "@/lib/floor-plan-export";
import { useFloorPlanStore } from "@/lib/floor-plan-store";

export function FloorPlanExportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const projectName = useFloorPlanStore((state) => state.projectName);
  const setProjectName = useFloorPlanStore((state) => state.setProjectName);
  const background = useFloorPlanStore((state) => state.background);
  const calibration = useFloorPlanStore((state) => state.calibration);
  const pixelsPerMeter = useFloorPlanStore((state) => state.pixelsPerMeter);
  const rooms = useFloorPlanStore((state) => state.rooms);
  const viewState = useFloorPlanStore((state) => state.viewState);
  const importProject = useFloorPlanStore((state) => state.importProject);
  const resetProject = useFloorPlanStore((state) => state.resetProject);

  const handleExport = () => {
    const project = serializeFloorPlanProject({
      projectName,
      background,
      calibration,
      pixelsPerMeter,
      rooms,
      viewState,
    });
    downloadFloorPlanJson(project);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const project = parseFloorPlanProject(JSON.parse(text));
      importProject({
        projectName: project.projectName,
        background: project.background,
        calibration: project.calibration,
        pixelsPerMeter: project.pixelsPerMeter,
        rooms: project.rooms,
        viewState: project.viewState,
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Import mislukt.",
      );
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--ls-black)]">Project</h3>
      <label className="block text-xs font-medium text-[var(--ls-black)]">
        Projectnaam
        <input
          type="text"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--ls-gray-light)] px-2 py-1.5 text-sm"
        />
      </label>
      <div className="flex flex-col gap-2">
        <button type="button" className="btn-primary text-sm" onClick={handleExport}>
          Exporteer JSON
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImport}
        />
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => inputRef.current?.click()}
        >
          Importeer JSON
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => {
            if (window.confirm("Weet u zeker dat u het project wilt wissen?")) {
              resetProject();
            }
          }}
        >
          Nieuw project
        </button>
      </div>
      <p className="text-xs text-[var(--ls-gray)]">
        Projectdata wordt automatisch lokaal opgeslagen en hersteld na refresh.
      </p>
    </div>
  );
}
