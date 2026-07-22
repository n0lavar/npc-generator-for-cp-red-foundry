import { buildCyberwareImportRequests } from "../mapping/item-mapper.js";
import { collectCompendiumItemEntries } from "./item-compendium.js";

export async function createCyberware(actor, generatedCyberware) {
  const mapping = buildCyberwareImportRequests(generatedCyberware);
  const itemsByName = await buildCyberwareIndex();
  const importedByRequestIndex = new Map();
  const unmatched = [...mapping.unmatched];
  let created = 0;

  for (const [requestIndex, request] of mapping.requests.entries()) {
    const match = request.candidates
      .map((candidate) => itemsByName.get(candidate))
      .find(Boolean);
    if (!match) {
      unmatched.push(request.name);
      continue;
    }

    const document = await match.pack.getDocument(match.entry._id);
    const source = document.toObject();
    if (source.system?.core) {
      const existingCoreItem = findOwnedCoreCyberware(actor, source.name);
      if (existingCoreItem) importedByRequestIndex.set(requestIndex, existingCoreItem);
      else unmatched.push(request.name);
      continue;
    }

    delete source._id;
    if (request.weaponType) source.system.weaponType = request.weaponType;
    const [createdItem] = await actor.createEmbeddedDocuments(
      "Item",
      [source],
      { createInstalled: false }
    );
    if (!createdItem) {
      unmatched.push(request.name);
      continue;
    }

    const target = request.parentIndex == null
      ? actor
      : importedByRequestIndex.get(request.parentIndex);
    if (!target || typeof target.installItems !== "function" || !await target.installItems([createdItem])) {
      await createdItem.delete();
      unmatched.push(request.name);
      continue;
    }

    importedByRequestIndex.set(requestIndex, createdItem);
    created += 1;
  }

  return { created, unmatched };
}

async function buildCyberwareIndex() {
  const itemsByName = new Map();
  for (const match of await collectCompendiumItemEntries(["cyberware"])) {
    if (!itemsByName.has(match.entry.name)) itemsByName.set(match.entry.name, match);
  }
  return itemsByName;
}

function findOwnedCoreCyberware(actor, name) {
  return (actor.itemTypes?.cyberware ?? [])
    .find((item) => item.name === name && item.system?.core);
}
