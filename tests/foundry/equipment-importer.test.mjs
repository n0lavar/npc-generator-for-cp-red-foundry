import assert from "node:assert/strict";
import test from "node:test";

import { createEquipment } from "../../scripts/foundry/equipment-importer.js";

test("clones equipment by beautiful name from any Item compendium", async () => {
  const compendiumSource = {
    _id: "guitar-id",
    name: "Electric Guitar",
    type: "gear",
    img: "electric-guitar.svg",
    system: { amount: 1, description: "A complete compendium item." }
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.gear",
    async getIndex() {
      return [{ _id: compendiumSource._id, name: compendiumSource.name, type: compendiumSource.type }];
    },
    async getDocument() {
      return { toObject: () => structuredClone(compendiumSource) };
    }
  };
  globalThis.game = { packs: new Map([[pack.collection, pack]]) };

  let createdSources;
  const actor = {
    async createEmbeddedDocuments(type, sources) {
      assert.equal(type, "Item");
      createdSources = sources;
    }
  };

  const result = await createEquipment(actor, [{
    item: {
      name: "Electric Guitar/Other Instrument",
      beautiful_name: "Electric Guitar",
      type: "equipment"
    },
    amount: 2
  }]);

  assert.deepEqual(result, { unmatched: [] });
  assert.deepEqual(createdSources, [{
    name: "Electric Guitar",
    type: "gear",
    img: "electric-guitar.svg",
    system: { amount: 2, description: "A complete compendium item." }
  }]);
});
