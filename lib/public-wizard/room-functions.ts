import type { RoomFunctionId } from "@/types/public-wizard";

export interface RoomFunctionDefinition {
  id: RoomFunctionId;
  name: string;
  suggestedLux: number;
  explanation: string;
  imageGradient: string;
}

export const ROOM_FUNCTIONS: RoomFunctionDefinition[] = [
  {
    id: "open_kantoor",
    name: "Open kantoor",
    suggestedLux: 500,
    explanation: "Werkplekken met uniforme verlichting voor concentratie.",
    imageGradient: "from-amber-900/40 to-zinc-800",
  },
  {
    id: "gesloten_kantoor",
    name: "Gesloten kantoor",
    suggestedLux: 500,
    explanation: "Individuele werkruimte met comfortabele helderheid.",
    imageGradient: "from-zinc-700 to-zinc-900",
  },
  {
    id: "vergader",
    name: "Vergaderruimte",
    suggestedLux: 500,
    explanation: "Goede zicht op schermen en tafel, zonder schittering.",
    imageGradient: "from-blue-900/40 to-zinc-800",
  },
  {
    id: "entree",
    name: "Entree",
    suggestedLux: 200,
    explanation: "Representatieve eerste indruk met voldoende orientatie.",
    imageGradient: "from-yellow-900/30 to-zinc-800",
  },
  {
    id: "gang",
    name: "Gang",
    suggestedLux: 100,
    explanation: "Veilige doorgang met basisverlichting.",
    imageGradient: "from-stone-700 to-zinc-900",
  },
  {
    id: "pantry",
    name: "Pantry / kantine",
    suggestedLux: 200,
    explanation: "Functionele verlichting voor gebruiksruimte.",
    imageGradient: "from-orange-900/30 to-zinc-800",
  },
  {
    id: "toilet",
    name: "Toilet",
    suggestedLux: 200,
    explanation: "Praktische verlichting voor kleine ruimtes.",
    imageGradient: "from-teal-900/30 to-zinc-800",
  },
  {
    id: "overig",
    name: "Overig",
    suggestedLux: 300,
    explanation: "Standaard uitgangspunt, later aanpasbaar.",
    imageGradient: "from-zinc-600 to-zinc-900",
  },
];

export function getRoomFunction(id: RoomFunctionId): RoomFunctionDefinition {
  return ROOM_FUNCTIONS.find((r) => r.id === id) ?? ROOM_FUNCTIONS[0]!;
}
