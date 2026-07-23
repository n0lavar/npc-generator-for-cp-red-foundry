import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAmmoImportRequests,
  buildArmorImportRequests,
  buildCyberwareImportRequests,
  buildEquipmentImportRequests,
  buildJunkImportRequests,
  buildWeaponImportRequests
} from "../../scripts/mapping/item-mapper.js";

test("builds junk requests and separates Eddies", () => {
  const result = buildJunkImportRequests([
    { item: { name: "Eddies", type: "junk", price: 1 }, amount: 51 },
    { item: { name: "Lighter", type: "junk", price: 10 }, amount: 1 },
    { item: { name: "Agent", type: "equipment", price: 100 }, amount: 1 }
  ]);

  assert.deepEqual(result, {
    requests: [{ name: "Lighter", candidates: ["Lighter"], amount: 1, price: 10 }],
    eddies: 51,
    unmatched: []
  });
});

test("reports junk with an invalid price", () => {
  const result = buildJunkImportRequests([
    { item: { name: "Broken Thing", type: "junk" }, amount: 1 }
  ]);

  assert.deepEqual(result, { requests: [], eddies: 0, unmatched: ["Broken Thing"] });
});

test("flattens the Developer mode cyberware root array", () => {
  const result = buildCyberwareImportRequests([{
    item: { name: "Cybereye" },
    children: [
      { item: { name: "Low Light / Infrared / UV" }, children: [] }
    ]
  }, {
    item: { name: "Eye Sockets" },
    children: [{
      item: { name: "Eye Sockets" },
      children: [
        { item: { name: "Cybereye" }, children: [{ item: { name: "Low Light / Infrared / UV" }, children: [] }] }
      ]
    }]
  }]);

  assert.deepEqual(result, {
    requests: [
      { name: "Cybereye", candidates: ["Cybereye"], parentIndex: null },
      { name: "Low Light / Infrared / UV", candidates: ["Low Light / Infrared / UV"], parentIndex: 0 },
      { name: "Cybereye", candidates: ["Cybereye"], parentIndex: null },
      { name: "Low Light / Infrared / UV", candidates: ["Low Light / Infrared / UV"], parentIndex: 2 }
    ],
    unmatched: []
  });
});

test("reports malformed cyberware nodes without discarding valid siblings", () => {
  const result = buildCyberwareImportRequests([{
    item: { name: "Meatbody" },
    children: [
      { item: {}, children: [] },
      { item: { name: "Neural Link" }, children: [] }
    ]
  }]);

  assert.deepEqual(result, {
    requests: [{ name: "Neural Link", candidates: ["Neural Link"], parentIndex: null }],
    unmatched: ["[object Object]"]
  });
});

test("rejects the historical single-root cyberware contract", () => {
  const result = buildCyberwareImportRequests({
    item: { name: "Cybereye" },
    children: []
  });

  assert.deepEqual(result, {
    requests: [],
    unmatched: ["[invalid cyberware root]"]
  });
});

test("maps renamed Developer mode cyberware containers to current Foundry names", () => {
  const result = buildCyberwareImportRequests([
    { item: { name: "Fashionware" }, children: [] },
    { item: { name: "Internal Cyberware" }, children: [] },
    { item: { name: "External Cyberware" }, children: [] }
  ]);

  assert.deepEqual(result, {
    requests: [
      { name: "Fashionware", candidates: ["Fashionware (7 Option Slots)"], parentIndex: null },
      { name: "Internal Cyberware", candidates: ["Internal (7 Option Slots)"], parentIndex: null },
      { name: "External Cyberware", candidates: ["External (7 Option Slots)"], parentIndex: null }
    ],
    unmatched: []
  });
});

test("maps popup cyberware variants to generic Foundry items and weapon types", () => {
  const result = buildCyberwareImportRequests([
    { item: { name: "Popup Melee Weapon (Heavy)" }, children: [] },
    { item: { name: "Popup Ranged Weapon (Very Heavy Pistol)" }, children: [] },
    { item: { name: "Popup Ranged Weapon (SMG)" }, children: [] }
  ]);

  assert.deepEqual(result, {
    requests: [
      {
        name: "Popup Melee Weapon (Heavy)",
        candidates: ["Popup Melee Weapon"],
        weaponType: "heavyMelee",
        parentIndex: null
      },
      {
        name: "Popup Ranged Weapon (Very Heavy Pistol)",
        candidates: ["Popup Ranged Weapon"],
        weaponType: "vHeavyPistol",
        parentIndex: null
      },
      {
        name: "Popup Ranged Weapon (SMG)",
        candidates: ["Popup Ranged Weapon"],
        weaponType: "smg",
        parentIndex: null
      }
    ],
    unmatched: []
  });
});

test("builds ammo requests only from typed inventory entries", () => {
  const result = buildAmmoImportRequests([
    { item: { name: "Rifle (Basic)", type: "ammo" }, amount: 30 },
    { item: { name: "Agent", type: "equipment" }, amount: 1 }
  ]);

  assert.deepEqual(result, {
    requests: [{ name: "Rifle (Basic)", candidates: ["Rifle (Basic)"], amount: 30 }],
    unmatched: []
  });
});

test("builds equipment requests with the beautiful name first", () => {
  const result = buildEquipmentImportRequests([
    {
      item: {
        name: "Electric Guitar/Other Instrument",
        beautiful_name: "Electric Guitar",
        type: "equipment"
      },
      amount: 1
    },
    { item: { name: "Duct Tape", type: "equipment" }, amount: 2 },
    { item: { name: "Net", type: "ammo" }, amount: 3 }
  ]);

  assert.deepEqual(result, {
    requests: [
      {
        name: "Electric Guitar/Other Instrument",
        candidates: ["Electric Guitar", "Electric Guitar/Other Instrument"],
        amount: 1
      },
      { name: "Duct Tape", candidates: ["Duct Tape"], amount: 2 }
    ],
    unmatched: []
  });
});

test("preserves Developer mode armor names for exact compendium lookup", () => {
  const result = buildArmorImportRequests([
    { name: "Light Armorjack (Body)", quality: null },
    { name: "Light Armorjack (Head)", quality: null }
  ]);

  assert.deepEqual(result, {
    requests: [
      {
        name: "Light Armorjack (Body)",
        candidates: ["Light Armorjack (Body)"]
      },
      {
        name: "Light Armorjack (Head)",
        candidates: ["Light Armorjack (Head)"]
      }
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
        "Dai Lung Streetmaster (Poor)",
        "Medium Pistol (Poor)",
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
