import assert from "node:assert/strict";
import test from "node:test";

import { importSkills } from "../../scripts/foundry/skill-importer.js";
import { createWeapons } from "../../scripts/foundry/weapon-importer.js";

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
  assert.deepEqual(result, {
    unmatched: [],
    importedNames: [
      "Handgun",
      "Play Instrument (Drums)",
      "Martial Arts (Taekwondo)"
    ]
  });
});

test("makes a newly imported Boxing specialization available to Martial Arts weapon import", async () => {
  const sources = [
    {
      _id: "boxing-skill-id",
      name: "Martial Arts (Boxing)",
      type: "skill",
      system: { level: 0 }
    },
    {
      _id: "martial-arts-weapon-id",
      name: "Martial Arts",
      type: "weapon",
      system: { equipped: "owned", weaponSkill: "MartialArts" }
    }
  ];
  const pack = {
    documentName: "Item",
    collection: "additional-module.martial-arts",
    async getIndex() {
      return sources.map(({ _id, name, type }) => ({ _id, name, type }));
    },
    async getDocument(id) {
      const source = sources.find((candidate) => candidate._id === id);
      return { toObject: () => structuredClone(source) };
    }
  };
  globalThis.game = { packs: new Map([[pack.collection, pack]]) };

  const created = [];
  const actor = {
    // Foundry may retain this pre-import snapshot until a later document refresh.
    itemTypes: { skill: [] },
    async createEmbeddedDocuments(_type, documents) {
      created.push(...documents);
    }
  };

  const skillResult = await importSkills(actor, { "MartialArts (Boxing)": 8 });
  await createWeapons(
    actor,
    [{
      name: "MartialArts (Boxing)",
      quality: null,
      skill: "MartialArts (Boxing)"
    }],
    skillResult.importedNames
  );

  assert.deepEqual(
    created.map((source) => source.name),
    ["Martial Arts (Boxing)", "Martial Arts"]
  );
  assert.equal(created[1].system.weaponSkill, "Martial Arts (Boxing)");
});
