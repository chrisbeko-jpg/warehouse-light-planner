"use client";

import dynamic from "next/dynamic";

export const WarehouseCanvas = dynamic(
  () => import("./WarehouseCanvas").then((mod) => mod.WarehouseCanvas),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Canvas laden…
        </div>
      </section>
    ),
  },
);
