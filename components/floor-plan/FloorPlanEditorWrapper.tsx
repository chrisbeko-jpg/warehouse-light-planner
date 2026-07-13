"use client";

import dynamic from "next/dynamic";

const FloorPlanCanvas = dynamic(
  () =>
    import("@/components/floor-plan/FloorPlanCanvas").then(
      (module) => module.FloorPlanCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <section className="ls-card p-4">
        <p className="text-sm text-[var(--ls-gray)]">Editor laden…</p>
      </section>
    ),
  },
);

export { FloorPlanCanvas };
