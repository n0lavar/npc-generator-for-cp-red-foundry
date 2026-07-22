import assert from "node:assert/strict";
import test from "node:test";

import { createJunk } from "../../scripts/foundry/junk-importer.js";

test("clones matching junk, creates missing junk, and deposits Eddies", async () => {
  const compendiumSource = {
    _id: "lighter-id",
    name: "Lighter",
    type: "gear",
    img: "lighter.svg",
    system: { amount: 1, price: { market: 20 }, description: "Compendium data." }
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
  let actorUpdate;
  const actor = {
    system: { wealth: { value: 100 } },
    async createEmbeddedDocuments(type, sources) {
      assert.equal(type, "Item");
      createdSources = sources;
    },
    async update(update) {
      actorUpdate = update;
    }
  };

  const result = await createJunk(actor, [
    { item: { name: "Eddies", type: "junk", price: 1 }, amount: 51 },
    { item: { name: "Lighter", type: "junk", price: 10 }, amount: 2 },
    { item: { name: "Poker Chip", type: "junk", price: 7 }, amount: 1 }
  ]);

  assert.deepEqual(result, { unmatched: [] });
  assert.deepEqual(createdSources, [{
    name: "Lighter",
    type: "gear",
    img: "lighter.svg",
    system: { amount: 2, price: { market: 20 }, description: "Compendium data." }
  }, {
    name: "Poker Chip",
    type: "gear",
    system: { amount: 1, price: { market: 7 } }
  }]);
  assert.deepEqual(actorUpdate, { "system.wealth.value": 151 });
});
