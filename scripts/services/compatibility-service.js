import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import { buildAmmoNameCandidates, buildWeaponNameCandidates } from "../mapping/item-mapper.js";
import { collectCompendiumItemEntries } from "../foundry/item-compendium.js";
import { getCompatibilityCatalog } from "./generator-service.js";

export async function checkCompatibility(execution) {
  const catalog = await getCompatibilityCatalog(execution);
  const documents = await collectItemDocuments();
  const equipmentEntries = await collectCompendiumItemEntries(["armor", "weapon"]);
  const armorNames = getEntryNames(equipmentEntries, "armor");
  const weaponNames = getEntryNames(equipmentEntries, "weapon");
  const statNames = getCharacterStatNames();
  const skillNames = documents
    .filter((document) => document.type === "skill")
    .map((document) => document.name);
  const itemNames = documents
    .filter((document) => document.type !== "skill")
    .map((document) => document.name);
  const ammoNames = documents
    .filter((document) => document.type === "ammo")
    .map((document) => document.name);

  return {
    stats: buildResult(catalog.stats, statNames),
    skills: buildResult(catalog.skills, skillNames),
    items: Object.entries(catalog.items).map(([name, expected]) => ({
      name,
      ...(name === "Weapons"
        ? buildWeaponResult(expected, weaponNames)
        : name === "Ammo"
          ? buildAmmoResult(expected, ammoNames)
          : buildResult(expected, name === "Armor" ? armorNames : itemNames))
    }))
  };
}

export function buildAmmoResult(ammoNames, availableNames) {
  const available = new Set(availableNames.map(normalizeDocumentName));
  const uniqueExpected = [...new Set(ammoNames)];
  const missing = uniqueExpected.filter((name) => !buildAmmoNameCandidates(name)
    .some((candidate) => available.has(normalizeDocumentName(candidate))));

  return {
    found: uniqueExpected.length - missing.length,
    total: uniqueExpected.length,
    missingCount: missing.length,
    missing
  };
}

function getEntryNames(matches, type) {
  return matches
    .filter((match) => match.entry.type === type)
    .map((match) => match.entry.name);
}

export function buildWeaponResult(weapons, availableNames) {
  const available = new Set(availableNames.map(normalizeDocumentName));
  const missing = weapons
    .filter((weapon) => !weaponCanBeMatched(weapon, available))
    .map((weapon) => weapon.name);

  return {
    found: weapons.length - missing.length,
    total: weapons.length,
    missingCount: missing.length,
    missing
  };
}

function weaponCanBeMatched(weapon, available) {
  const beautifulNames = weapon.beautiful_names_by_quality ?? {};
  return ["poor", "standard", "excellent"].every((quality) => {
    const candidates = buildWeaponNameCandidates({
      name: weapon.name,
      beautifulName: beautifulNames[quality],
      quality
    });
    return candidates.some((candidate) => available.has(normalizeDocumentName(candidate)));
  });
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
