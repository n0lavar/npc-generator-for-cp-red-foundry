import assert from "node:assert/strict";
import test from "node:test";

import { createDrugs } from "../../scripts/foundry/drug-importer.js";

test("clones drugs from any Item compendium and applies the generated amount", async () => {
  const compendiumSource = {
    _id: "black-lace-id",
    name: "Black Lace",
    type: "drug",
    img: "black-lace.svg",
    system: {
      amount: 1,
      consumed: "None",
      description: "A complete compendium item."
    }
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.drugs",
    async getIndex() {
      return [{
        _id: compendiumSource._id,
        name: compendiumSource.name,
        type: compendiumSource.type
      }];
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

  const result = await createDrugs(actor, [{
    item: { name: "Black Lace", type: "drug", price: 50, quality: null },
    amount: 2
  }]);

  assert.deepEqual(result, { unmatched: [] });
  assert.deepEqual(createdSources, [{
    name: "Black Lace",
    type: "drug",
    img: "black-lace.svg",
    system: {
      amount: 2,
      consumed: "None",
      description: "A complete compendium item."
    }
  }]);
});

test("reports a drug that is absent from all Item compendiums", async () => {
  globalThis.game = { packs: new Map() };
  const actor = {
    async createEmbeddedDocuments() {
      assert.fail("No embedded Items should be created.");
    }
  };

  const result = await createDrugs(actor, [{
    item: { name: "Unknown Drug", type: "drug", price: 50, quality: null },
    amount: 1
  }]);

  assert.deepEqual(result, { unmatched: ["Unknown Drug"] });
});
