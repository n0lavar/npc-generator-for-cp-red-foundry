import assert from "node:assert/strict";
import test from "node:test";

import { createWeapons } from "../../scripts/foundry/weapon-importer.js";

test("clones the first matching weapon candidate from an additional module compendium", async () => {
  const source = {
    _id: "weapon-id",
    name: "Dai Lung Streetmaster",
    type: "weapon",
    img: "weapon.svg",
    system: { damage: "2d6", equipped: "owned" }
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.weapons",
    async getIndex() {
      return [{ _id: source._id, name: source.name, type: source.type }];
    },
    async getDocument() {
      return { toObject: () => structuredClone(source) };
    }
  };
  globalThis.game = { packs: new Map([["additional-module.weapons", pack]]) };

  const actor = {
    itemTypes: { skill: [] },
    async createEmbeddedDocuments(type, sources) {
      assert.equal(type, "Item");
      assert.equal(sources[0]._id, undefined);
      assert.equal(sources[0].name, "Dai Lung Streetmaster");
      assert.equal(sources[0].img, "weapon.svg");
      assert.equal(sources[0].system.equipped, "equipped");
    }
  };

  const result = await createWeapons(actor, [{
    name: "Medium Pistol",
    beautiful_name: "Dai Lung Streetmaster",
    quality: "poor"
  }]);

  assert.deepEqual(result, { unmatched: [] });
});

test("imports Unarmed even though the generator does not assign it a quality", async () => {
  const source = {
    _id: "unarmed-id",
    name: "Unarmed",
    type: "weapon",
    system: { equipped: "owned" }
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.weapons",
    async getIndex() {
      return [{ _id: source._id, name: source.name, type: source.type }];
    },
    async getDocument() {
      return { toObject: () => structuredClone(source) };
    }
  };
  globalThis.game = { packs: new Map([[pack.collection, pack]]) };

  let createdSource;
  const actor = {
    itemTypes: { skill: [] },
    async createEmbeddedDocuments(_type, sources) {
      [createdSource] = sources;
    }
  };

  const result = await createWeapons(actor, [{ name: "Unarmed", quality: null }]);

  assert.deepEqual(result, { unmatched: [] });
  assert.equal(createdSource.name, "Unarmed");
  assert.equal(createdSource.system.equipped, "equipped");
});

test("imports Martial Arts and links it to the generated specialization skill", async () => {
  const source = {
    _id: "martial-arts-id",
    name: "Martial Arts",
    type: "weapon",
    system: { equipped: "owned", weaponSkill: "MartialArts" }
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.weapons",
    async getIndex() {
      return [{ _id: source._id, name: source.name, type: source.type }];
    },
    async getDocument() {
      return { toObject: () => structuredClone(source) };
    }
  };
  globalThis.game = { packs: new Map([[pack.collection, pack]]) };

  let createdSource;
  const actor = {
    itemTypes: {
      skill: [{ name: "Martial Arts (Karate)" }]
    },
    async createEmbeddedDocuments(_type, sources) {
      [createdSource] = sources;
    }
  };

  const result = await createWeapons(actor, [{
    name: "MartialArts (Karate)",
    quality: null,
    skill: "MartialArts (Karate)"
  }]);

  assert.deepEqual(result, { unmatched: [] });
  assert.equal(createdSource.name, "Martial Arts");
  assert.equal(createdSource.system.weaponSkill, "Martial Arts (Karate)");
});
