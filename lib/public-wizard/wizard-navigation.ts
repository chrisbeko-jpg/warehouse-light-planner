import type { WizardInputMethod, WizardStepId } from "@/types/public-wizard";

const BASE_STEPS: WizardStepId[] = ["room", "atmosphere", "inputMethod"];

export function getWizardFlowSteps(inputMethod: WizardInputMethod | null): WizardStepId[] {
  const tail: WizardStepId[] = ["editor", "result", "request"];
  if (inputMethod === "dimensions") {
    return [...BASE_STEPS, "dimensions", ...tail];
  }
  if (inputMethod === "floorplan") {
    return [...BASE_STEPS, "floorplan", ...tail];
  }
  return [...BASE_STEPS, ...tail];
}

export function getNextWizardStep(
  step: WizardStepId,
  inputMethod: WizardInputMethod | null,
): WizardStepId | null {
  const flow = getWizardFlowSteps(inputMethod);
  const idx = flow.indexOf(step);
  if (idx < 0 || idx >= flow.length - 1) return null;
  return flow[idx + 1] ?? null;
}

export function getPrevWizardStep(
  step: WizardStepId,
  inputMethod: WizardInputMethod | null,
): WizardStepId | null {
  const flow = getWizardFlowSteps(inputMethod);
  const idx = flow.indexOf(step);
  if (idx <= 0) return null;
  return flow[idx - 1] ?? null;
}

export function isWizardProgressStepReachable(
  target: WizardStepId,
  current: WizardStepId,
  inputMethod: WizardInputMethod | null,
): boolean {
  const flow = getWizardFlowSteps(inputMethod);
  const targetIdx = flow.indexOf(target);
  const currentIdx = flow.indexOf(current);
  if (targetIdx < 0 || currentIdx < 0) return false;
  return targetIdx <= currentIdx;
}

/** @deprecated use isWizardProgressStepReachable */
export function isWizardStepReachable(
  target: WizardStepId,
  current: WizardStepId,
  inputMethod: WizardInputMethod | null,
): boolean {
  return isWizardProgressStepReachable(target, current, inputMethod);
}

export function isWizardFlowStep(step: WizardStepId, inputMethod: WizardInputMethod | null): boolean {
  return getWizardFlowSteps(inputMethod).includes(step);
}

export const WIZARD_PROGRESS_STEP_IDS: WizardStepId[] = [
  "room",
  "atmosphere",
  "inputMethod",
  "floorplan",
  "dimensions",
  "editor",
  "result",
];

export const WIZARD_STEP_LABELS: {
  id: WizardStepId;
  label: string;
  showInProgress: boolean;
}[] = [
  { id: "room", label: "Ruimte", showInProgress: true },
  { id: "atmosphere", label: "Sfeer", showInProgress: true },
  { id: "inputMethod", label: "Invoer", showInProgress: true },
  { id: "floorplan", label: "Plattegrond", showInProgress: true },
  { id: "dimensions", label: "Afmetingen", showInProgress: true },
  { id: "editor", label: "Lichtplan", showInProgress: true },
  { id: "result", label: "Resultaat", showInProgress: true },
  { id: "request", label: "Aanvragen", showInProgress: false },
];

export function getVisibleProgressSteps(inputMethod: WizardInputMethod | null) {
  return WIZARD_STEP_LABELS.filter((item) => {
    if (!item.showInProgress) return false;
    if (item.id === "floorplan") return inputMethod === "floorplan";
    if (item.id === "dimensions") return inputMethod === "dimensions";
    if (item.id === "inputMethod") return true;
    return WIZARD_PROGRESS_STEP_IDS.includes(item.id);
  });
}
