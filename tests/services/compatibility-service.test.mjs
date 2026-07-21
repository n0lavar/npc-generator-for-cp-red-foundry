import assert from "node:assert/strict";
import test from "node:test";

import { buildWeaponResult } from "../../scripts/services/compatibility-service.js";

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
  }], ["Dai Lung Streetmaster (poor)", "Federated Arms X-9mm (standard)"]);

  assert.deepEqual(result.missing, ["Medium Pistol"]);
});
