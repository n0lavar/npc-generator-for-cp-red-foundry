import {
  buildActorBiographyUpdate,
  buildActorName,
  buildPrototypeTokenSource,
  buildPrototypeTokenUpdate,
  buildStatUpdate
} from "../mapping/actor-mapper.js";
import { createAndEquipArmor } from "./armor-importer.js";
import { createAmmo } from "./ammo-importer.js";
import { importSkills } from "./skill-importer.js";
import { createWeapons } from "./weapon-importer.js";
import { createCyberware } from "./cyberware-importer.js";
import { createEquipment } from "./equipment-importer.js";
import { createDrugs } from "./drug-importer.js";
import { createJunk } from "./junk-importer.js";
import { createRole } from "./role-importer.js";
import { localizeOrFallback } from "../utils/localization.js";

const ACTOR_TYPE = "character";

export async function createActorFromNpc(npc, onProgress, tokenDisposition = -1) {
  validateNpc(npc);

  onProgress?.("creatingActor");
  const actor = await CONFIG.Actor.documentClass.create({
    name: buildActorName(npc),
    type: ACTOR_TYPE,
    prototypeToken: buildPrototypeTokenSource(tokenDisposition)
  });

  try {
    // The Cyberpunk RED Actor creation lifecycle initializes prototype tokens
    // as Friendly, so enforce the user's selection after creation completes.
    await actor.update(buildPrototypeTokenUpdate(tokenDisposition));

    const statMapping = buildStatUpdate(actor.system.stats, npc.stats);
    onProgress?.("importingSkills");
    const skillResult = await importSkills(actor, npc.skills);
    onProgress?.("importingRole");
    const roleResult = await createRole(actor, npc.role);

    onProgress?.("updatingActor");
    if (Object.keys(statMapping.update).length > 0) {
      await actor.update(statMapping.update);
    }
    const biographyUpdate = buildActorBiographyUpdate(npc, getLifepathLabels());
    if (Object.keys(biographyUpdate).length > 0) {
      await actor.update(biographyUpdate);
    }
    await initializeDerivedResources(actor);
    onProgress?.("importingCyberware");
    const cyberwareResult = await createCyberware(actor, npc.cyberware);
    onProgress?.("importingArmor");
    const armorResult = await createAndEquipArmor(
      actor,
      [...(npc.armor ?? []), ...cyberwareResult.armor]
    );
    onProgress?.("importingWeapons");
    const weaponResult = await createWeapons(actor, npc.weapons);
    onProgress?.("importingInventory");
    const ammoResult = await createAmmo(actor, npc.inventory);
    const equipmentResult = await createEquipment(actor, npc.inventory);
    const drugResult = await createDrugs(actor, npc.inventory);
    const junkResult = await createJunk(actor, npc.inventory);

    reportUnmatchedNames("stats", statMapping.unmatched);
    reportUnmatchedNames("skills", skillResult.unmatched);
    reportUnmatchedNames("roles", roleResult.unmatched);
    reportUnmatchedNames("cyberware", cyberwareResult.unmatched);
    reportUnmatchedNames("armor", armorResult.unmatched);
    reportUnmatchedNames("weapons", weaponResult.unmatched);
    reportUnmatchedNames("ammo", ammoResult.unmatched);
    reportUnmatchedNames("equipment", equipmentResult.unmatched);
    reportUnmatchedNames("drugs", drugResult.unmatched);
    reportUnmatchedNames("junk", junkResult.unmatched);
    return actor;
  } catch (error) {
    await actor.delete();
    throw error;
  }
}

function getLifepathLabels() {
  return {
    friend: localizeOrFallback("FriendRelationship", "Relationship to you"),
    loveAffair: localizeOrFallback("LoveAffairOutcome", "What happened"),
    enemy: {
      enemy: localizeOrFallback("EnemyWho", "Who"),
      cause: localizeOrFallback("EnemyCause", "Cause"),
      wronged_party: localizeOrFallback("EnemyWrongedParty", "Wronged party"),
      resources: localizeOrFallback("EnemyResources", "Resources"),
      reaction: localizeOrFallback("EnemyReaction", "Reaction")
    }
  };
}

async function initializeDerivedResources(actor) {
  const maxHp = actor.calcMaxHp();
  await actor.update({
    "system.derivedStats.hp.max": maxHp,
    "system.derivedStats.hp.value": maxHp
  });

  await actor.setMaxHumanity();
  await actor.update({
    "system.derivedStats.humanity.value": actor.system.derivedStats.humanity.max,
    "system.stats.emp.value": actor.system.stats.emp.max
  });
}

function validateNpc(npc) {
  if (!npc || typeof npc !== "object") {
    throw new Error("The generated NPC result is not an object.");
  }
  if (!npc.stats || typeof npc.stats !== "object") {
    throw new Error("The generated NPC does not contain stats.");
  }
  if (!npc.skills || typeof npc.skills !== "object") {
    throw new Error("The generated NPC does not contain skills.");
  }
  if (typeof npc.role !== "string" || !npc.role.trim()) {
    throw new Error("The generated NPC does not contain a role.");
  }
}

function reportUnmatchedNames(kind, names) {
  if (names.length === 0) return;
  console.warn(`NPC Generator | Unmatched ${kind}:`, names);
}
