import { FLOOR_PLAN_SCHEMA_VERSION } from "@/types/floor-plan";
import type { FloorPlanPersistedState, FloorPlanProject } from "@/types/floor-plan";

export function serializeFloorPlanProject(
  state: Pick<
    FloorPlanPersistedState,
    | "projectName"
    | "background"
    | "calibration"
    | "pixelsPerMeter"
    | "rooms"
    | "viewState"
  >,
): FloorPlanProject {
  return {
    version: FLOOR_PLAN_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projectName: state.projectName,
    background: state.background,
    calibration: state.calibration,
    pixelsPerMeter: state.pixelsPerMeter,
    rooms: state.rooms,
    viewState: state.viewState,
  };
}

export function parseFloorPlanProject(raw: unknown): FloorPlanProject {
  if (!raw || typeof raw !== "object") {
    throw new Error("Ongeldig JSON-bestand.");
  }

  const data = raw as Partial<FloorPlanProject>;
  if (data.version !== FLOOR_PLAN_SCHEMA_VERSION) {
    throw new Error("Niet-ondersteunde projectversie.");
  }

  if (typeof data.projectName !== "string") {
    throw new Error("Projectnaam ontbreekt.");
  }

  if (!Array.isArray(data.rooms)) {
    throw new Error("Ruimtelijst ontbreekt.");
  }

  return data as FloorPlanProject;
}

export function downloadFloorPlanJson(project: FloorPlanProject, fileName?: string) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    fileName ?? `${project.projectName.replace(/\s+/g, "-").toLowerCase() || "plattegrond"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
