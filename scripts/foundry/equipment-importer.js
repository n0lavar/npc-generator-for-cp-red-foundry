import { buildEquipmentImportRequests } from "../mapping/item-mapper.js";
import { buildCompendiumItemSources } from "./compendium-item-importer.js";

export async function createEquipment(actor, generatedInventory) {
  const mapping = buildEquipmentImportRequests(generatedInventory);
  if (mapping.requests.length === 0) return { unmatched: mapping.unmatched };

  const result = await buildCompendiumItemSources("gear", mapping.requests, (source, request) => {
    source.system.amount = request.amount;
  });

  if (result.sources.length > 0) {
    await actor.createEmbeddedDocuments("Item", result.sources);
  }

  return { unmatched: [...mapping.unmatched, ...result.unmatched] };
}
