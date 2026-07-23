import assert from "node:assert/strict";
import test from "node:test";

import {
  redactGenerationSecrets
} from "../../scripts/utils/logging.js";

test("redacts the generator API key without changing other parameters", () => {
  const options = {
    rank: "captain",
    model_api_key: "secret",
    forbidden_skills: ["Science (Chemistry)"]
  };

  assert.deepEqual(redactGenerationSecrets(options), {
    rank: "captain",
    model_api_key: "[REDACTED]",
    forbidden_skills: ["Science (Chemistry)"]
  });
  assert.equal(options.model_api_key, "secret");
});
