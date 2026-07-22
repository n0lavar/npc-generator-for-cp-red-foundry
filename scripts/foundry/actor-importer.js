import {
  buildActorName,
  buildStatUpdate
} from "../mapping/actor-mapper.js";
import { createAndEquipArmor } from "./armor-importer.js";
import { createAmmo } from "./ammo-importer.js";
import { importSkills } from "./skill-importer.js";
import { createWeapons } from "./weapon-importer.js";
import { createCyberware } from "./cyberware-importer.js";
import { createEquipment } from "./equipment-importer.js";

const ACTOR_TYPE = "character";

export async function createActorFromNpc(npc) {
  validateNpc(npc);

  const actor = await CONFIG.Actor.documentClass.create({
    name: buildActorName(npc),
    type: ACTOR_TYPE
  });

  try {
    const statMapping = buildStatUpdate(actor.system.stats, npc.stats);
    const skillResult = await importSkills(actor, npc.skills);

    if (Object.keys(statMapping.update).length > 0) {
      await actor.update(statMapping.update);
    }
    await initializeDerivedResources(actor);
    const cyberwareResult = await createCyberware(actor, npc.cyberware);
    const armorResult = await createAndEquipArmor(actor, npc.armor);
    const weaponResult = await createWeapons(actor, npc.weapons);
    const ammoResult = await createAmmo(actor, npc.inventory);
    const equipmentResult = await createEquipment(actor, npc.inventory);

    reportUnmatchedNames("stats", statMapping.unmatched);
    reportUnmatchedNames("skills", skillResult.unmatched);
    reportUnmatchedNames("cyberware", cyberwareResult.unmatched);
    reportUnmatchedNames("armor", armorResult.unmatched);
    reportUnmatchedNames("weapons", weaponResult.unmatched);
    reportUnmatchedNames("ammo", ammoResult.unmatched);
    reportUnmatchedNames("equipment", equipmentResult.unmatched);
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
