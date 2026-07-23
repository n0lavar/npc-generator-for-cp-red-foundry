import assert from "node:assert/strict";
import {
  buildActorBiographyUpdate,
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

assert.deepEqual(buildActorBiographyUpdate({
  lifepath: {
    cultural_origin: "Eastern Europe",
    language: "Russian",
    personality: "Stable & serious",
    hairstyle: "Short <undercut>",
    affectation: "Always wears mirrorshades",
    feel_about_people: "People are tools",
    family_background: {
      name: "Nomad Pack",
      description: "The family was always there."
    },
    friends: ["A teacher or mentor."],
    enemies: [{
      enemy: "Ex-friend",
      cause: "Lost face",
      wronged_party: "You",
      resources: "Just themselves",
      reaction: "Avoid them"
    }],
    tragic_love_affairs: [],
    life_goal: "Get what's yours"
  },
  description: "First line\nSecond <line>"
}), {
  "system.lifepath.culturalOrigin": "<p>Eastern Europe</p><p>Russian</p>",
  "system.lifepath.personality": "<p>Stable &amp; serious</p>",
  "system.lifepath.hairStyle": "<p>Short &lt;undercut&gt;</p>",
  "system.lifepath.affectations": "<p>Always wears mirrorshades</p>",
  "system.lifepath.aboutPeople": "<p>People are tools</p>",
  "system.lifepath.familyBackground": "<p>Nomad Pack</p><p>The family was always there.</p>",
  "system.lifepath.friends": "<ol><li>A teacher or mentor.</li></ol>",
  "system.lifepath.enemies": "<ol><li>Ex-friend — Lost face — You — Just themselves — Avoid them</li></ol>",
  "system.lifepath.lifeGoals": "<p>Get what&#039;s yours</p>",
  "system.information.notes": "<p>First line<br>Second &lt;line&gt;</p>"
});

assert.deepEqual(buildActorBiographyUpdate({
  lifepath: {},
  description: ""
}), {});
