"use client";

let viewerPromise: Promise<typeof import("@/components/public-wizard/room3d/Room3DViewer")> | null = null;

export function loadRoom3DViewer() {
  viewerPromise ??= import("@/components/public-wizard/room3d/Room3DViewer").catch(error => {
    viewerPromise = null;
    throw error;
  });
  return viewerPromise;
}

export function preloadRoom3DViewer() {
  void loadRoom3DViewer().catch(() => undefined);
}
