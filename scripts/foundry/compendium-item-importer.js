import {
  collectItemSourceEntries,
  getItemSourceDocument
} from "./item-compendium.js";

export async function buildCompendiumItemSources(itemType, requests, prepareSource) {
  const itemsByName = new Map();
  for (const match of await collectItemSourceEntries([itemType])) {
    if (!itemsByName.has(match.entry.name)) itemsByName.set(match.entry.name, match);
  }

  const sources = [];
  const unmatched = [];

  for (const request of requests) {
    const match = request.candidates
      .map((candidate) => itemsByName.get(candidate))
      .find(Boolean);
    if (!match) {
      unmatched.push(request.name);
      continue;
    }

    const document = await getItemSourceDocument(match);
    const source = document.toObject();
    delete source._id;
    prepareSource?.(source, request);
    sources.push(source);
  }

  return { sources, unmatched };
}
