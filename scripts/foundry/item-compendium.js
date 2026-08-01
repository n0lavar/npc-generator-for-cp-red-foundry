export async function collectItemSourceEntries(itemTypes = null) {
  const acceptedTypes = itemTypes == null ? null : new Set(itemTypes);
  const entries = (game.items?.contents ?? [])
    .filter((document) => acceptedTypes == null || acceptedTypes.has(document.type))
    .map((document) => ({
      entry: { _id: document.id, name: document.name, type: document.type },
      document
    }));
  const packs = [...game.packs.values()]
    .filter((pack) => pack.documentName === "Item");

  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["name", "type"] });
      entries.push(...index
        .filter((entry) => acceptedTypes == null || acceptedTypes.has(entry.type))
        .map((entry) => ({ entry, pack })));
    } catch (error) {
      console.warn(`NPC Generator | Could not inspect Item pack ${pack.collection}.`, error);
    }
  }

  return entries;
}

export async function getItemSourceDocument(match) {
  return match.document ?? match.pack.getDocument(match.entry._id);
}
