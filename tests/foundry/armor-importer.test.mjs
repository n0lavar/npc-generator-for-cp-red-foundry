import assert from "node:assert/strict";
import test from "node:test";

import { createAndEquipArmor } from "../../scripts/foundry/armor-importer.js";

test("clones armor from an additional module compendium and tracks its location", async () => {
  const compendiumSource = {
    _id: "compendium-id",
    name: "Light Armorjack (Body)",
    type: "armor",
    img: "systems/cyberpunk-red-core/icons/compendium/armor/light-armorjack-body.svg",
    system: {
      equipped: "owned",
      isBodyLocation: true,
      isHeadLocation: false,
      isShield: false,
      bodyLocation: { sp: 11, ablation: 0 }
    }
  };
  const pack = {
    documentName: "Item",
    collection: "additional-module.armor",
    async getIndex() {
      return [{ _id: "compendium-id", name: compendiumSource.name, type: "armor" }];
    },
    async getDocument() {
      return { toObject: () => structuredClone(compendiumSource) };
    }
  };
  globalThis.game = { packs: new Map([["additional-module.armor", pack]]) };

  const tracked = [];
  const actor = {
    async createEmbeddedDocuments(_type, sources) {
      assert.equal(sources[0]._id, undefined);
      assert.equal(sources[0].img, compendiumSource.img);
      assert.equal(sources[0].system.equipped, "equipped");
      return [{ id: "actor-item-id", system: sources[0].system }];
    },
    async updateTrackedArmor(location, id) {
      tracked.push([location, id]);
    }
  };

  const result = await createAndEquipArmor(actor, [
    { name: "Light Armorjack (Body)" }
  ]);

  assert.deepEqual(result.unmatched, []);
  assert.deepEqual(tracked, [["body", "actor-item-id"]]);
});
