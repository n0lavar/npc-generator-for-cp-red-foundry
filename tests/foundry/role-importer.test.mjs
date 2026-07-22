import assert from "node:assert/strict";
import test from "node:test";

import { createRole } from "../../scripts/foundry/role-importer.js";

test("clones the generated role from any Item compendium", async () => {
  const source = {
    _id: "solo-id",
    name: "Solo",
    type: "role",
    img: "solo.svg",
    system: { rank: 4 }
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.roles",
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
    async createEmbeddedDocuments(type, sources) {
      assert.equal(type, "Item");
      [createdSource] = sources;
      return [{ ...createdSource, id: "created-role" }];
    }
  };

  const result = await createRole(actor, "solo");

  assert.equal(createdSource._id, undefined);
  assert.equal(createdSource.name, "Solo");
  assert.equal(createdSource.img, "solo.svg");
  assert.deepEqual(result, { created: 1, unmatched: [] });
});
