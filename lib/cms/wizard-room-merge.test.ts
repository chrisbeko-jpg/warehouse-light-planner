import assert from "node:assert/strict";
import test from "node:test";
import { mergeWizardContent } from "@/lib/cms/merge";
import { DEFAULT_CMS_SITE } from "@/lib/cms/defaults";

test("mergeWizardContent returns only three room choices after legacy stored data", () => {
  const legacyStored = {
    roomChoices: [
      ...DEFAULT_CMS_SITE.wizard.roomChoices,
      {
        id: "open_kantoor" as never,
        title: "Legacy open kantoor",
        description: "",
        suggestedLux: 500,
        active: true,
        sortOrder: 99,
      },
      {
        id: "gang" as never,
        title: "Legacy gang",
        description: "",
        suggestedLux: 100,
        active: true,
        sortOrder: 100,
      },
    ],
  };

  const merged = mergeWizardContent(legacyStored);
  assert.equal(merged.roomChoices.length, 3);
  assert.deepEqual(
    merged.roomChoices.map((c) => c.id).sort(),
    ["other_spaces", "reception_hall", "workplace_office"],
  );
  assert.equal(merged.roomChoices.find((c) => c.id === "workplace_office")?.suggestedLux, 500);
  assert.equal(merged.roomChoices.find((c) => c.id === "reception_hall")?.suggestedLux, 250);
  assert.equal(merged.roomChoices.find((c) => c.id === "other_spaces")?.suggestedLux, 200);
});
