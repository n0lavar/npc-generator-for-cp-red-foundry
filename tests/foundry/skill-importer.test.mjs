import assert from "node:assert/strict";
import test from "node:test";

import { importSkills } from "../../scripts/foundry/skill-importer.js";

test("updates existing skills and clones missing specializations from any compendium", async () => {
  const compendiumSources = [
    { _id: "drums-id", name: "Play Instrument (Drums)", type: "skill", system: { level: 0 } },
    { _id: "taekwondo-id", name: "Martial Arts (Taekwondo)", type: "skill", system: { level: 0 } }
  ];
  const pack = {
    documentName: "Item",
    collection: "additional-module.specialized-skills",
    async getIndex() {
      return compendiumSources.map(({ _id, name, type }) => ({ _id, name, type }));
    },
    async getDocument(id) {
      const source = compendiumSources.find((candidate) => candidate._id === id);
      return { toObject: () => structuredClone(source) };
    }
  };
  globalThis.game = { packs: new Map([[pack.collection, pack]]) };

  const updated = [];
  let created = [];
  const actor = {
    itemTypes: { skill: [{ id: "handgun-id", name: "Handgun" }] },
    async updateEmbeddedDocuments(_type, updates) {
      updated.push(...updates);
    },
    async createEmbeddedDocuments(_type, sources) {
      created = sources;
    }
  };

  const result = await importSkills(actor, {
    Handgun: 6,
    "PlayInstrument (Drums)": 4,
    "MartialArts (Taekwondo)": 8
  });

  assert.deepEqual(updated, [{ _id: "handgun-id", "system.level": 6 }]);
  assert.deepEqual(created.map((source) => [source.name, source.system.level]), [
    ["Play Instrument (Drums)", 4],
    ["Martial Arts (Taekwondo)", 8]
  ]);
  assert.ok(created.every((source) => source._id === undefined));
  assert.deepEqual(result, { unmatched: [] });
});
