"use client";

import { BackgroundUpload } from "@/components/floor-plan/BackgroundUpload";
import { FloorPlanExportPanel } from "@/components/floor-plan/FloorPlanExportPanel";
import { RoomListPanel } from "@/components/floor-plan/RoomListPanel";
import { ScaleCalibrationPanel } from "@/components/floor-plan/ScaleCalibrationPanel";
import { SelectedRoomPanel } from "@/components/floor-plan/SelectedRoomPanel";

export function FloorPlanSidebar() {
  return (
    <aside className="space-y-4">
      <div className="ls-card space-y-4 p-4">
        <FloorPlanExportPanel />
        <BackgroundUpload />
        <ScaleCalibrationPanel />
      </div>
      <div className="ls-card space-y-4 p-4">
        <RoomListPanel />
        <SelectedRoomPanel />
      </div>
    </aside>
  );
}
