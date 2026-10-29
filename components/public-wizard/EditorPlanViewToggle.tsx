"use client";

import { usePublicWizardStore } from "@/lib/public-wizard/store";
import type { EditorPlanView } from "@/types/public-wizard";

export function EditorPlanViewToggle({ disabled }: { disabled?: boolean }) {
  const view = usePublicWizardStore((s) => s.editorPlanView);
  const setEditorPlanView = usePublicWizardStore((s) => s.setEditorPlanView);

  const btn = (id: EditorPlanView, label: string) => (
    <button
      type="button"
      disabled={disabled}
      data-testid={id === "3d" ? "editor-view-3d" : "editor-view-2d"}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        view === id
          ? "bg-[var(--lp-primary)] text-white"
          : "bg-white text-[var(--lp-text)] border border-[var(--lp-border)]"
      } disabled:opacity-40`}
      onClick={() => setEditorPlanView(id)}
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      data-testid="editor-plan-view-toggle"
      role="tablist"
      aria-label="Weergave lichtplan"
    >
      {btn("2d", "2D Lichtplan")}
      {btn("3d", "3D Weergave")}
    </div>
  );
}
