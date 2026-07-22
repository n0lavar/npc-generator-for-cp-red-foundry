import assert from "node:assert/strict";
import test from "node:test";

import { createCyberware } from "../../scripts/foundry/cyberware-importer.js";

test("reuses core cyberware and installs cloned children through the system lifecycle", async () => {
  const compendiumSources = [
    {
      _id: "fashionware-id",
      name: "Fashionware (7 Option Slots)",
      type: "cyberware",
      system: { core: true }
    },
    {
      _id: "chemskin-id",
      name: "Chemskin",
      type: "cyberware",
      img: "chemskin.svg",
      system: { core: false, size: 1 }
    }
  ];
  const pack = {
    documentName: "Item",
    collection: "additional-module.cyberware",
    async getIndex() {
      return compendiumSources.map(({ _id, name, type }) => ({ _id, name, type }));
    },
    async getDocument(id) {
      const source = compendiumSources.find((candidate) => candidate._id === id);
      return { toObject: () => structuredClone(source) };
    }
  };
  globalThis.game = { packs: new Map([[pack.collection, pack]]) };

  const installed = [];
  const coreFashionware = {
    name: "Fashionware (7 Option Slots)",
    system: { core: true },
    async installItems(items) {
      installed.push(...items);
      return true;
    }
  };
  const createdSources = [];
  const actor = {
    itemTypes: { cyberware: [coreFashionware] },
    async createEmbeddedDocuments(type, sources, context) {
      assert.equal(type, "Item");
      assert.deepEqual(context, { createInstalled: false });
      createdSources.push(...sources);
      return sources.map((source, index) => ({
        ...source,
        id: `created-${createdSources.length}-${index}`,
        async delete() {}
      }));
    }
  };

  const result = await createCyberware(actor, [{
    item: { name: "Fashionware" },
    children: [
      { item: { name: "Chemskin" }, children: [] },
      { item: { name: "Chemskin" }, children: [] }
    ]
  }]);

  assert.equal(createdSources.length, 2);
  assert.equal(createdSources[0]._id, undefined);
  assert.equal(createdSources[0].img, "chemskin.svg");
  assert.equal(installed.length, 2);
  assert.deepEqual(result, { created: 2, unmatched: [] });
});

test("sets the selected weapon type on generic popup cyberware", async () => {
  const source = {
    _id: "popup-id",
    name: "Popup Ranged Weapon",
    type: "cyberware",
    system: { core: false, weaponType: "medPistol" }
  };
  const pack = {
    documentName: "Item",
    collection: "core.cyberware",
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
    itemTypes: { cyberware: [] },
    async createEmbeddedDocuments(type, sources) {
      assert.equal(type, "Item");
      [createdSource] = sources;
      return [{ ...createdSource, id: "created-popup", async delete() {} }];
    },
    async installItems() {
      return true;
    }
  };

  const result = await createCyberware(actor, [{
    item: { name: "Popup Ranged Weapon (SMG)" },
    children: []
  }]);

  assert.equal(createdSource.name, "Popup Ranged Weapon");
  assert.equal(createdSource.system.weaponType, "smg");
  assert.deepEqual(result, { created: 1, unmatched: [] });
});
