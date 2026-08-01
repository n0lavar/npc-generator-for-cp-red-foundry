import { buildJunkImportRequests } from "../mapping/item-mapper.js";
import {
  collectItemSourceEntries,
  getItemSourceDocument
} from "./item-compendium.js";

export async function createJunk(actor, generatedInventory) {
  const mapping = buildJunkImportRequests(generatedInventory);
  const gearByName = new Map();

  for (const match of await collectItemSourceEntries(["gear"])) {
    if (!gearByName.has(match.entry.name)) gearByName.set(match.entry.name, match);
  }

  const sources = [];
  for (const request of mapping.requests) {
    const match = request.candidates.map((candidate) => gearByName.get(candidate)).find(Boolean);
    if (match) {
      const document = await getItemSourceDocument(match);
      const source = document.toObject();
      delete source._id;
      source.system.amount = request.amount;
      sources.push(source);
      continue;
    }

    sources.push({
      name: request.name,
      type: "gear",
      system: {
        amount: request.amount,
        price: { market: request.price }
      }
    });
  }

  if (sources.length > 0) await actor.createEmbeddedDocuments("Item", sources);
  if (mapping.eddies > 0) {
    const currentWealth = Number(actor.system.wealth?.value) || 0;
    await actor.update({ "system.wealth.value": currentWealth + mapping.eddies });
  }

  return { unmatched: mapping.unmatched };
}
