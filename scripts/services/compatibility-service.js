import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import { getCompatibilityCatalog } from "./generator-service.js";

export async function checkCompatibility(execution) {
  const catalog = await getCompatibilityCatalog(execution);
  const documents = await collectItemDocuments();
  const statNames = getCharacterStatNames();
  const skillNames = documents
    .filter((document) => document.type === "skill")
    .map((document) => document.name);
  const itemNames = documents
    .filter((document) => document.type !== "skill")
    .map((document) => document.name);

  return {
    stats: buildResult(catalog.stats, statNames),
    skills: buildResult(catalog.skills, skillNames),
    items: Object.entries(catalog.items).map(([name, expected]) => ({
      name,
      ...buildResult(expected, itemNames)
    }))
  };
}

function buildResult(expectedNames, availableNames) {
  const uniqueExpected = [...new Set(expectedNames)];
  const available = new Set(availableNames.map(normalizeDocumentName));
  const missing = uniqueExpected.filter((name) => !available.has(normalizeDocumentName(name)));
  return {
    found: uniqueExpected.length - missing.length,
    total: uniqueExpected.length,
    missingCount: missing.length,
    missing
  };
}

function getCharacterStatNames() {
  const model = CONFIG.Actor.dataModels.character;
  const statsField = model?.schema?.fields?.stats;
  const fields = statsField?.fields ?? statsField?.schema?.fields;
  if (!fields) throw new Error("The Cyberpunk RED character stat schema could not be inspected.");
  return Object.keys(fields);
}

async function collectItemDocuments() {
  const documents = [...game.items.contents];
  const itemPacks = game.packs.filter((pack) => pack.documentName === "Item");

  for (const pack of itemPacks) {
    try {
      documents.push(...await pack.getDocuments());
    } catch (error) {
      console.warn(`NPC Generator | Could not inspect Item pack ${pack.collection}.`, error);
    }
  }

  return documents;
}
