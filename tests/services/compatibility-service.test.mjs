import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAmmoResult,
  buildCyberwareResult,
  buildWeaponResult
} from "../../scripts/services/compatibility-service.js";
import { buildAmmoNameCandidates } from "../../scripts/mapping/item-mapper.js";

test("checks every weapon quality with the same candidate fallbacks as import", () => {
  const result = buildWeaponResult([{
    name: "Medium Pistol",
    beautiful_names_by_quality: {
      poor: "Dai Lung Streetmaster",
      standard: "Federated Arms X-9mm",
      excellent: "Militech Avenger"
    }
  }], ["Dai Lung Streetmaster", "Medium Pistol"]);

  assert.deepEqual(result, {
    found: 1,
    total: 1,
    missingCount: 0,
    missing: []
  });
});

test("reports a weapon when any quality has no matching candidate", () => {
  const result = buildWeaponResult([{
    name: "Medium Pistol",
    beautiful_names_by_quality: {
      poor: "Dai Lung Streetmaster",
      standard: "Federated Arms X-9mm",
      excellent: "Militech Avenger"
    }
  }], ["Dai Lung Streetmaster (Poor)", "Federated Arms X-9mm (Standard)"]);

  assert.deepEqual(result.missing, ["Medium Pistol"]);
});

test("matches special ammo whose generated type repeats its compendium name", () => {
  const result = buildAmmoResult(
    ["Net (Net)", "MagnaSlot BatteryBrick (MagnaSlot BatteryBrick)"],
    ["Net", "MagnaSlot BatteryBrick"]
  );

  assert.deepEqual(result, {
    found: 2,
    total: 2,
    missingCount: 0,
    missing: []
  });
});

test("does not strip a meaningful ammo modification", () => {
  assert.deepEqual(buildAmmoNameCandidates("Rifle (Basic)"), ["Rifle (Basic)"]);
});

test("excludes Developer mode technical cyberware from compatibility totals", () => {
  const result = buildCyberwareResult([
    "Meatbody",
    "Fashionware",
    "Neuralware",
    "Eye Sockets",
    "Auditory System",
    "Internal Cyberware",
    "External Cyberware",
    "Shoulders",
    "Hips",
    "Borgware",
    "Cybereye",
    "Neural Link"
  ], ["Cybereye"]);

  assert.deepEqual(result, {
    found: 1,
    total: 2,
    missingCount: 1,
    missing: ["Neural Link"]
  });
});

test("matches popup cyberware variants to generic Foundry items", () => {
  const result = buildCyberwareResult([
    "Popup Melee Weapon (Light)",
    "Popup Melee Weapon (Medium)",
    "Popup Melee Weapon (Heavy)",
    "Popup Ranged Weapon (Medium Pistol)",
    "Popup Ranged Weapon (Heavy Pistol)",
    "Popup Ranged Weapon (Very Heavy Pistol)",
    "Popup Ranged Weapon (SMG)"
  ], ["Popup Melee Weapon", "Popup Ranged Weapon"]);

  assert.deepEqual(result, {
    found: 7,
    total: 7,
    missingCount: 0,
    missing: []
  });
});

test("uses the same exact cyberware candidates as import", () => {
  const result = buildCyberwareResult(
    ["Spray Paint Cyber Finger", "Scrambler / Descrambler"],
    ["Spray Paint Cyberfinger", "Scrambler/Descrambler"]
  );

  assert.deepEqual(result, {
    found: 0,
    total: 2,
    missingCount: 2,
    missing: ["Spray Paint Cyber Finger", "Scrambler / Descrambler"]
  });
});
