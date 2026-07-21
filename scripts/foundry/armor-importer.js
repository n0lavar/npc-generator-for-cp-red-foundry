import { buildArmorImportRequests } from "../mapping/item-mapper.js";
import { collectCompendiumItemEntries } from "./item-compendium.js";

export async function createAndEquipArmor(actor, generatedArmor) {
  const mapping = buildArmorImportRequests(generatedArmor);
  if (mapping.requests.length === 0) {
    return { unmatched: mapping.unmatched };
  }

  const armorByName = new Map(
    (await collectCompendiumItemEntries(["armor"]))
      .map((match) => [match.entry.name, match])
  );
  const sources = [];

  for (const request of mapping.requests) {
    const match = armorByName.get(request.name);
    if (!match) {
      mapping.unmatched.push(request.name);
      continue;
    }

    const armorDocument = await match.pack.getDocument(match.entry._id);
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
