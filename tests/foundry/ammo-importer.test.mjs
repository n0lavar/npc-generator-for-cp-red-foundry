import assert from "node:assert/strict";
import test from "node:test";

import { createAmmo } from "../../scripts/foundry/ammo-importer.js";

test("clones ammo from any Item compendium and applies the generated amount", async () => {
  const sources = [
    { _id: "net-id", name: "Net", type: "ammo", system: { amount: 1 } },
    {
      _id: "battery-id",
      name: "MagnaSlot BatteryBrick",
      type: "ammo",
      system: { amount: 32 }
    }
  ];
  const pack = {
    documentName: "Item",
    collection: "additional-module.ammo",
    async getIndex() {
      return sources.map(({ _id, name, type }) => ({ _id, name, type }));
    },
    async getDocument(id) {
      const source = sources.find((candidate) => candidate._id === id);
      return { toObject: () => structuredClone(source) };
    }
  };
  globalThis.game = { packs: new Map([[pack.collection, pack]]) };

  let createdSources;
  const actor = {
    async createEmbeddedDocuments(type, items) {
      assert.equal(type, "Item");
      createdSources = items;
    }
  };

  const result = await createAmmo(actor, [
    { item: { name: "Net (Net)", type: "ammo" }, amount: 2 },
    {
      item: {
        name: "MagnaSlot BatteryBrick (MagnaSlot BatteryBrick)",
        type: "ammo"
      },
      amount: 7
    },
    { item: { name: "Agent", type: "equipment" }, amount: 1 }
  ]);

  assert.deepEqual(result, { unmatched: [] });
  assert.deepEqual(createdSources.map(({ _id, name, system }) => ({ _id, name, amount: system.amount })), [
    { _id: undefined, name: "Net", amount: 2 },
    { _id: undefined, name: "MagnaSlot BatteryBrick", amount: 7 }
  ]);
});
