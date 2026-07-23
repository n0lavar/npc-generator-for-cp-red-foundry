import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompatibilityDefaults
} from "../../scripts/services/compatibility-defaults.js";

test("uses missing compatibility skills as forbidden_skills defaults", () => {
  const missing = ["Science (Chemistry)", "Play Instrument (Guitar)"];

  assert.deepEqual(
    buildCompatibilityDefaults({ skills: { missing } }),
    { forbidden_skills: missing }
  );
  assert.notEqual(
    buildCompatibilityDefaults({ skills: { missing } }).forbidden_skills,
    missing,
    "the compatibility report must not be mutated through the saved defaults"
  );
});

test("rejects malformed missing skill results", () => {
  assert.throws(
    () => buildCompatibilityDefaults({ skills: { missing: "Brawling" } }),
    /array of missing skills/
  );
});
