import { buildArmorImportRequests } from "../mapping/item-mapper.js";
import { buildCompendiumItemSources } from "./compendium-item-importer.js";

export async function createAndEquipArmor(actor, generatedArmor) {
  const mapping = buildArmorImportRequests(generatedArmor);
  if (mapping.requests.length === 0) {
    return { unmatched: mapping.unmatched };
  }

  const result = await buildCompendiumItemSources("armor", mapping.requests, (source) => {
    source.system.equipped = "equipped";
  });

  const createdArmor = result.sources.length > 0
    ? await actor.createEmbeddedDocuments("Item", result.sources)
    : [];

  for (const armor of createdArmor) {
    await trackEquippedArmor(actor, armor);
  }

  return { unmatched: [...mapping.unmatched, ...result.unmatched] };
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
