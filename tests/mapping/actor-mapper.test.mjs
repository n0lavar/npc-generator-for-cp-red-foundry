import assert from "node:assert/strict";
import {
  buildActorBiographyUpdate,
  buildActorName,
  buildPrototypeTokenSource,
  buildPrototypeTokenUpdate,
  buildSkillUpdates,
  buildStatUpdate
} from "../../scripts/mapping/actor-mapper.js";

assert.equal(buildActorName({ name: "Morgan", surname: "Blackhand" }), "Morgan Blackhand");

assert.deepEqual(buildPrototypeTokenSource(-2), { disposition: -2, displayName: 0 });
assert.deepEqual(buildPrototypeTokenSource(-1), { disposition: -1, displayName: 0 });
assert.deepEqual(buildPrototypeTokenSource(0), { disposition: 0, displayName: 50 });
assert.deepEqual(buildPrototypeTokenSource(1), { disposition: 1, displayName: 50 });
assert.deepEqual(buildPrototypeTokenUpdate(-1), {
  "prototypeToken.disposition": -1,
  "prototypeToken.displayName": 0
});
assert.throws(
  () => buildPrototypeTokenSource(2),
  /Unsupported Token Disposition/
);

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
  "system.lifepath.friends": "<ol><li><strong>Relationship to you:</strong> A teacher or mentor.</li></ol>",
  "system.lifepath.enemies": "<ol><li><strong>Who:</strong> Ex-friend<br><strong>Cause:</strong> Lost face<br><strong>Wronged party:</strong> You<br><strong>Resources:</strong> Just themselves<br><strong>Reaction:</strong> Avoid them</li></ol>",
  "system.lifepath.lifeGoals": "<p>Get what&#039;s yours</p>",
  "system.information.notes": "<p>First line<br>Second &lt;line&gt;</p>"
});

assert.deepEqual(buildActorBiographyUpdate({
  lifepath: {},
  description: ""
}), {});

assert.deepEqual(buildActorBiographyUpdate({
  lifepath: {
    enemies: [{
      enemy: "Rival <fixer>",
      cause: "A deal went bad & became personal"
    }, null, {}]
  }
}), {
  "system.lifepath.enemies": "<ol><li><strong>Who:</strong> Rival &lt;fixer&gt;<br><strong>Cause:</strong> A deal went bad &amp; became personal</li></ol>"
});

assert.deepEqual(buildActorBiographyUpdate({
  lifepath: {
    friends: ["Old partner"],
    tragic_love_affairs: ["They vanished"]
  }
}, {
  friend: "Connection",
  loveAffair: "Outcome",
  enemy: {}
}), {
  "system.lifepath.friends": "<ol><li><strong>Connection:</strong> Old partner</li></ol>",
  "system.lifepath.tragicLoveAffairs": "<ol><li><strong>Outcome:</strong> They vanished</li></ol>"
});

assert.deepEqual(buildActorBiographyUpdate({
  lifepath: {
    enemies: [
      { enemy: "First rival" },
      { enemy: "Second rival" }
    ]
  }
}), {
  "system.lifepath.enemies": "<ol><li><strong>Who:</strong> First rival</li><br><li><strong>Who:</strong> Second rival</li></ol>"
});
