import { buildArmorImportRequests } from "../mapping/item-mapper.js";

const CORE_ARMOR_PACK_ID = "cyberpunk-red-core.core_armor";

export async function createAndEquipArmor(actor, generatedArmor) {
  const mapping = buildArmorImportRequests(generatedArmor);
  if (mapping.requests.length === 0) {
    return { unmatched: mapping.unmatched };
  }

  const pack = game.packs.get(CORE_ARMOR_PACK_ID);
  if (!pack) {
    throw new Error(`The Cyberpunk RED armor compendium is unavailable: ${CORE_ARMOR_PACK_ID}`);
  }

  const index = await pack.getIndex({ fields: ["name", "type"] });
  const armorByName = new Map(
    index
      .filter((entry) => entry.type === "armor")
      .map((entry) => [entry.name, entry])
  );
  const sources = [];

  for (const request of mapping.requests) {
    const entry = armorByName.get(request.name);
    if (!entry) {
      mapping.unmatched.push(request.name);
      continue;
    }

    const armorDocument = await pack.getDocument(entry._id);
    const source = armorDocument.toObject();
    delete source._id;
    source.system.equipped = "equipped";
    sources.push(source);
  }

  const createdArmor = sources.length > 0
    ? await actor.createEmbeddedDocuments("Item", sources)
    : [];

  for (const armor of createdArmor) {
    await trackEquippedArmor(actor, armor);
  }

  return { unmatched: mapping.unmatched };
}

async function trackEquippedArmor(actor, armor) {
  if (armor.system.isHeadLocation) {
    await actor.updateTrackedArmor("head", armor.id);
  }
  if (armor.system.isBodyLocation) {
    await actor.updateTrackedArmor("body", armor.id);
  }
  if (armor.system.isShield) {
    await actor.updateTrackedArmor("shield", armor.id);
  }
}
