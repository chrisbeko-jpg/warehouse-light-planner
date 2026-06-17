import { cloneLineWithSlotTypes } from "@/lib/optimization";
import type { DrawnLightLine, LightLine, LineFillMode, LuxLevel, SlotType } from "@/types";

export const CALCULATION_DISCLAIMER =
  "Indicatieve berekening, geen vervanging voor officiële DIALux/Relux-berekening.";

export function buildSlotTypesForFillMode(
  positionCount: number,
  mode: LineFillMode,
): SlotType[] {
  if (mode === "continuous") {
    return Array.from({ length: positionCount }, () => "module");
  }

  return Array.from({ length: positionCount }, (_, index) =>
    index % 2 === 0 ? "module" : "blankplate",
  );
}

export function applyLineFillMode(lines: LightLine[], mode: LineFillMode): LightLine[] {
  return lines.map((line) =>
    cloneLineWithSlotTypes(line, buildSlotTypesForFillMode(line.maxPositions, mode)),
  );
}

export function applyPositionOverrides(
  lines: LightLine[],
  drawnLines: DrawnLightLine[],
): LightLine[] {
  return lines.map((line) => {
    const drawn = drawnLines.find((entry) => entry.id === line.id);
    if (drawn?.positionTypes && drawn.positionTypes.length === line.slots.length) {
      return cloneLineWithSlotTypes(line, drawn.positionTypes);
    }
    return line;
  });
}

export function applyFillAndOverrides(
  baseLines: LightLine[],
  drawnLines: DrawnLightLine[],
  fillMode: LineFillMode,
): LightLine[] {
  return applyPositionOverrides(applyLineFillMode(baseLines, fillMode), drawnLines);
}

export function getFillModeLabel(mode: LineFillMode): string {
  return mode === "continuous" ? "Continu gevuld" : "Om-en-om met blindplaten";
}

export function evaluateLightStatus(
  averageLux: number,
  targetLux: LuxLevel,
  lineFillMode: LineFillMode,
): { lightStatus: "sufficient" | "insufficient"; fillAdvice: string } {
  const sufficient = averageLux >= targetLux;

  if (lineFillMode === "continuous") {
    return {
      lightStatus: sufficient ? "sufficient" : "insufficient",
      fillAdvice: sufficient
        ? "Continu gevuld haalt het gewenste luxniveau indicatief. Dim indien nodig naar het geadviseerde vermogen per module."
        : "Continu gevuld haalt het gewenste luxniveau indicatief niet. Voeg extra lichtlijnen toe.",
    };
  }

  if (sufficient) {
    return {
      lightStatus: "sufficient",
      fillAdvice:
        "Om-en-om met blindplaten is indicatief voldoende en verlaagt investering en vermogen.",
    };
  }

  return {
    lightStatus: "insufficient",
    fillAdvice:
      "Om-en-om met blindplaten haalt het gewenste luxniveau indicatief niet. Kies continu gevuld of voeg extra lichtlijnen toe.",
  };
}
