import assert from "node:assert/strict";
import test from "node:test";
import { mergeWizardContent } from "@/lib/cms/merge";
import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";

test("mergeWizardContent returns four distinct room choices after legacy stored data", () => {
  const legacyStored = {
    roomChoices: [
      ...DEFAULT_CMS_SITE.wizard.roomChoices,
      {
        id: "open_kantoor" as never,
        title: "Legacy open kantoor",
        description: "",
        imageAlt: "",
        suggestedLux: 500,
        active: true,
        sortOrder: 99,
      },
      {
        id: "gang" as never,
        title: "Legacy gang",
        description: "",
        imageAlt: "",
        suggestedLux: 100,
        active: true,
        sortOrder: 100,
      },
    ],
  };

  const merged = mergeWizardContent(legacyStored);
  assert.equal(merged.roomChoices.length, 4);
  assert.deepEqual(
    merged.roomChoices.map((c) => c.id).sort(),
    ["meeting_room", "other_spaces", "reception_hall", "workplace_office"],
  );
  assert.equal(merged.roomChoices.find((c) => c.id === "workplace_office")?.suggestedLux, 500);
  assert.equal(merged.roomChoices.find((c) => c.id === "meeting_room")?.suggestedLux, 400);
  assert.equal(merged.roomChoices.find((c) => c.id === "reception_hall")?.suggestedLux, 250);
  assert.equal(merged.roomChoices.find((c) => c.id === "other_spaces")?.suggestedLux, 150);
});

test("legacy meeting choices cannot rename the workplace and keep their own lux", () => {
  const merged = mergeWizardContent({ roomChoices: [
    { id: "vergader" as never, title: "Vergaderruimte", description: "", imageAlt: "", suggestedLux: 500, active: true, sortOrder: 0 },
    { id: "open_kantoor" as never, title: "Werkplek kantoor", description: "", imageAlt: "", suggestedLux: 500, active: true, sortOrder: 1 },
  ] });
  assert.deepEqual(merged.roomChoices.map(({ id, title, suggestedLux }) => ({ id, title, suggestedLux })), [
    { id: "workplace_office", title: "Werkplek", suggestedLux: 500 },
    { id: "meeting_room", title: "Vergaderruimte", suggestedLux: 400 },
    { id: "reception_hall", title: "Gangzone", suggestedLux: 250 },
    { id: "other_spaces", title: "Overig", suggestedLux: 150 },
  ]);
 });
