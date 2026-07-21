import assert from "node:assert/strict";
import test from "node:test";

import { buildArmorImportRequests } from "../../scripts/mapping/item-mapper.js";

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

test("reports malformed armor records", () => {
  const result = buildArmorImportRequests([{ quality: null }]);

  assert.deepEqual(result.requests, []);
  assert.deepEqual(result.unmatched, ["[object Object]"]);
});
