import type { RoomFunctionId } from "@/types/public-wizard";

export interface RoomFunctionDefinition {
  id: RoomFunctionId;
  name: string;
  suggestedLux: number;
  imageGradient: string;
}

export const ROOM_FUNCTIONS: RoomFunctionDefinition[] = [
  {
    id: "workplace_office",
    name: "Werkplek kantoor",
    suggestedLux: 500,
    imageGradient: "from-zinc-700 to-zinc-900",
  },
  {
    id: "reception_hall",
    name: "Ontvangst / Halzones",
    suggestedLux: 250,
    imageGradient: "from-yellow-900/30 to-zinc-800",
  },
  {
    id: "other_spaces",
    name: "Overige ruimtes",
    suggestedLux: 200,
    imageGradient: "from-stone-700 to-zinc-900",
  },
];

const LEGACY_ROOM_ID_MAP: Record<string, RoomFunctionId> = {
  open_kantoor: "workplace_office",
  gesloten_kantoor: "workplace_office",
  vergader: "workplace_office",
  entree: "reception_hall",
  gang: "reception_hall",
  pantry: "other_spaces",
  toilet: "other_spaces",
  overig: "other_spaces",
};

export function normalizeRoomFunctionId(id: string): RoomFunctionId | null {
  if (ROOM_FUNCTIONS.some((room) => room.id === id)) {
    return id as RoomFunctionId;
  }
  return LEGACY_ROOM_ID_MAP[id] ?? null;
}

export function getRoomFunction(id: RoomFunctionId): RoomFunctionDefinition {
  return ROOM_FUNCTIONS.find((r) => r.id === id) ?? ROOM_FUNCTIONS[0]!;
}
