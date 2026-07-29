import { buildDrugImportRequests } from "../mapping/item-mapper.js";
import { buildCompendiumItemSources } from "./compendium-item-importer.js";

export async function createDrugs(actor, generatedInventory) {
  const mapping = buildDrugImportRequests(generatedInventory);
  if (mapping.requests.length === 0) return { unmatched: mapping.unmatched };

  const result = await buildCompendiumItemSources("drug", mapping.requests, (source, request) => {
    source.system.amount = request.amount;
  });

  if (result.sources.length > 0) {
    await actor.createEmbeddedDocuments("Item", result.sources);
  }

  return { unmatched: [...mapping.unmatched, ...result.unmatched] };
}
