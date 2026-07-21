import assert from "node:assert/strict";
import test from "node:test";

import {
  buildArmorImportRequests,
  buildWeaponImportRequests
} from "../../scripts/mapping/item-mapper.js";

test("preserves Developer mode armor names for exact compendium lookup", () => {
  const result = buildArmorImportRequests([
    { name: "Light Armorjack (Body)", quality: null },
    { name: "Light Armorjack (Head)", quality: null }
  ]);

  assert.deepEqual(result, {
    requests: [
      { name: "Light Armorjack (Body)" },
      { name: "Light Armorjack (Head)" }
    ],
    unmatched: []
  });
});

test("builds weapon lookup candidates in contract order", () => {
  const result = buildWeaponImportRequests([{
    name: "Medium Pistol",
    beautiful_name: "Dai Lung Streetmaster",
    quality: "poor"
  }]);

  assert.deepEqual(result, {
    requests: [{
      name: "Medium Pistol",
      candidates: [
        "Dai Lung Streetmaster (poor)",
        "Medium Pistol (poor)",
        "Dai Lung Streetmaster",
        "Medium Pistol"
      ],
      skill: ""
    }],
    unmatched: []
  });
});

test("rejects weapons with unsupported quality", () => {
  const result = buildWeaponImportRequests([{ name: "Medium Pistol", quality: "legendary" }]);
  assert.deepEqual(result, { requests: [], unmatched: ["Medium Pistol"] });
});

test("looks up synthetic unqualified weapons such as Unarmed by name", () => {
  const result = buildWeaponImportRequests([{
    name: "Unarmed",
    beautiful_name: null,
    quality: null
  }]);

  assert.deepEqual(result, {
    requests: [{ name: "Unarmed", candidates: ["Unarmed"], skill: "" }],
    unmatched: []
  });
});

test("maps a MartialArts specialization to the generic compendium weapon", () => {
  const result = buildWeaponImportRequests([{
    name: "MartialArts (Karate)",
    quality: null,
    skill: "MartialArts (Karate)"
  }]);

  assert.deepEqual(result, {
    requests: [{
      name: "MartialArts (Karate)",
      candidates: ["Martial Arts"],
      skill: "MartialArts (Karate)"
    }],
    unmatched: []
  });
});

test("reports malformed armor records", () => {
  const result = buildArmorImportRequests([{ quality: null }]);

  assert.deepEqual(result.requests, []);
  assert.deepEqual(result.unmatched, ["[object Object]"]);
});
