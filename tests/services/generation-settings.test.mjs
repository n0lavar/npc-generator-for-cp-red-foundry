import assert from "node:assert/strict";
import {
  applyGenerationSettings,
  mergeGenerationSettings,
  readTokenDispositionSetting
} from "../../scripts/services/generation-settings.js";

const fields = [
  { name: "rank", default: "mook" },
  { name: "allow_description", default: false },
  { name: "forbidden_skills", default: [] },
  { name: "unconfigured", default: 7 }
];

assert.deepEqual(
  applyGenerationSettings(fields, {
    rank: "captain",
    "allow-description": true,
    "forbidden-skills": ["Science (Chemistry)"]
  }),
  [
    { name: "rank", default: "captain" },
    { name: "allow_description", default: true },
    {
      name: "forbidden_skills",
      default: ["Science (Chemistry)"]
    },
    { name: "unconfigured", default: 7 }
  ]
);
assert.equal(fields[0].default, "mook", "input fields must not be mutated");

assert.equal(readTokenDispositionSetting({ token_disposition: 0 }), 0);
assert.equal(readTokenDispositionSetting({ "token-disposition": 1 }), 1);
assert.equal(readTokenDispositionSetting({}), -1);
assert.throws(
  () => readTokenDispositionSetting({ token_disposition: 2 }),
  /token_disposition/
);

assert.deepEqual(
  mergeGenerationSettings(
    { rank: "captain", "allow-description": true, "log-level": "INFO" },
    { rank: "mook", allow_description: false, seed: 42 }
  ),
  {
    rank: "mook",
    "allow-description": false,
    "log-level": "INFO",
    seed: 42
  }
);
