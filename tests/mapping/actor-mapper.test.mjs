import assert from "node:assert/strict";
import {
  buildActorName,
  buildSkillUpdates,
  buildStatUpdate
} from "../../scripts/mapping/actor-mapper.js";

assert.equal(buildActorName({ name: "Morgan", surname: "Blackhand" }), "Morgan Blackhand");

const statMapping = buildStatUpdate(
  { ref: { value: 6 }, luck: { value: 6, max: 6 } },
  { REF: 8, LUCK: 7 }
);
assert.deepEqual(statMapping, {
  update: {
    "system.stats.ref.value": 8,
    "system.stats.luck.value": 7,
    "system.stats.luck.max": 7
  },
  unmatched: []
});

const skillMapping = buildSkillUpdates(
  [
    { id: "one", name: "Local Expert (Your Home)" },
    { id: "two", name: "Conceal / Reveal Object" }
  ],
  { LocalExpertYourHome: 4, ConcealRevealObject: 6 }
);
assert.deepEqual(skillMapping, {
  updates: [
    { _id: "one", "system.level": 4 },
    { _id: "two", "system.level": 6 }
  ],
  unmatched: []
});
