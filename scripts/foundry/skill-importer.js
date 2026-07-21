import { buildSkillUpdates, normalizeDocumentName } from "../mapping/actor-mapper.js";
import { collectCompendiumItemEntries } from "./item-compendium.js";

export async function importSkills(actor, generatedSkills) {
  const mapping = buildSkillUpdates(actor.itemTypes.skill, generatedSkills);

  if (mapping.updates.length > 0) {
    await actor.updateEmbeddedDocuments("Item", mapping.updates);
  }
  if (mapping.unmatched.length === 0) return { unmatched: [] };

  const skillsByName = new Map();
  for (const match of await collectCompendiumItemEntries(["skill"])) {
    const normalizedName = normalizeDocumentName(match.entry.name);
    if (!skillsByName.has(normalizedName)) skillsByName.set(normalizedName, match);
  }

  const sources = [];
  const unmatched = [];
  for (const generatedName of mapping.unmatched) {
    const match = skillsByName.get(normalizeDocumentName(generatedName));
    if (!match) {
      unmatched.push(generatedName);
      continue;
    }

    const document = await match.pack.getDocument(match.entry._id);
    const source = document.toObject();
    delete source._id;
    source.system.level = generatedSkills[generatedName];
    sources.push(source);
  }

  if (sources.length > 0) await actor.createEmbeddedDocuments("Item", sources);
  return { unmatched };
}
