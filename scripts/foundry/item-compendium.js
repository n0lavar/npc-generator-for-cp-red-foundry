export async function collectCompendiumItemEntries(itemTypes) {
  const acceptedTypes = new Set(itemTypes);
  const entries = [];
  const packs = [...game.packs.values()]
    .filter((pack) => pack.documentName === "Item");

  for (const pack of packs) {
    try {
      const index = await pack.getIndex({ fields: ["name", "type"] });
      entries.push(...index
        .filter((entry) => acceptedTypes.has(entry.type))
        .map((entry) => ({ entry, pack })));
    } catch (error) {
      console.warn(`NPC Generator | Could not inspect Item pack ${pack.collection}.`, error);
    }
  }

  return entries;
}
