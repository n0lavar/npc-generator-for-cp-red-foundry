import assert from "node:assert/strict";
import test from "node:test";

import {
  collectItemSourceEntries,
  getItemSourceDocument
} from "../../scripts/foundry/item-compendium.js";

test("indexes world Items before all compendium Item types", async () => {
  const worldSkill = {
    id: "world-skill-id",
    name: "Martial Arts (Arnis)",
    type: "skill",
    toObject: () => ({ name: "Martial Arts (Arnis)", type: "skill" })
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.items",
    async getIndex() {
      return [
        { _id: "skill-id", name: "Martial Arts (Karate)", type: "skill" },
        { _id: "weapon-id", name: "Martial Arts", type: "weapon" }
      ];
    }
  };
  globalThis.game = {
    packs: new Map([[pack.collection, pack]]),
    items: { contents: [worldSkill] }
  };

  const matches = await collectItemSourceEntries();

  assert.deepEqual(
    matches.map(({ entry }) => [entry.name, entry.type]),
    [
      ["Martial Arts (Arnis)", "skill"],
      ["Martial Arts (Karate)", "skill"],
      ["Martial Arts", "weapon"]
    ]
  );
  assert.equal(await getItemSourceDocument(matches[0]), worldSkill);
});
