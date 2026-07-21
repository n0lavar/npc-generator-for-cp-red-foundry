import {
  buildActorName,
  buildSkillUpdates,
  buildStatUpdate
} from "../mapping/actor-mapper.js";
import { createAndEquipArmor } from "./armor-importer.js";

const ACTOR_TYPE = "character";

export async function createActorFromNpc(npc) {
  validateNpc(npc);

  const actor = await CONFIG.Actor.documentClass.create({
    name: buildActorName(npc),
    type: ACTOR_TYPE
  });

  try {
    const statMapping = buildStatUpdate(actor.system.stats, npc.stats);
    const skillMapping = buildSkillUpdates(actor.itemTypes.skill, npc.skills);

    if (Object.keys(statMapping.update).length > 0) {
      await actor.update(statMapping.update);
    }
    await initializeDerivedResources(actor);
    if (skillMapping.updates.length > 0) {
      await actor.updateEmbeddedDocuments("Item", skillMapping.updates);
    }
    const armorResult = await createAndEquipArmor(actor, npc.armor);

    reportUnmatchedNames("stats", statMapping.unmatched);
    reportUnmatchedNames("skills", skillMapping.unmatched);
    reportUnmatchedNames("armor", armorResult.unmatched);
    return actor;
  } catch (error) {
    await actor.delete();
    throw error;
  }
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
}

function reportUnmatchedNames(kind, names) {
  if (names.length === 0) return;
  console.warn(`NPC Generator | Unmatched ${kind}:`, names);
}
