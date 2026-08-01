import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import {
  buildAmmoNameCandidates,
  buildCyberwareItemMapping,
  getCyberwareArmorName,
  buildWeaponNameCandidates
} from "../mapping/item-mapper.js";
import { collectItemSourceEntries } from "../foundry/item-compendium.js";
import { getCompatibilityCatalog } from "./generator-service.js";

const TECHNICAL_CYBERWARE_NAMES = new Set([
  "Meatbody",
  "Fashionware",
  "Neuralware",
  "Eye Sockets",
  "Auditory System",
  "Internal Cyberware",
  "External Cyberware",
  "Shoulders",
  "Hips",
  "Borgware"
]);

export async function checkCompatibility(execution, onProgress) {
  const catalog = await getCompatibilityCatalog(execution, onProgress);
  onProgress?.("collectingDocuments");
  const itemEntries = await collectItemSourceEntries();
  const armorNames = getEntryNames(itemEntries, "armor");
  const weaponNames = getEntryNames(itemEntries, "weapon");
  const statNames = getCharacterStatNames();
  const skillNames = getEntryNames(itemEntries, "skill");
  const itemNames = itemEntries
    .filter((match) => match.entry.type !== "skill")
    .map((match) => match.entry.name);
  const ammoNames = getEntryNames(itemEntries, "ammo");
  const cyberwareNames = getEntryNames(itemEntries, "cyberware");

  return {
    stats: buildNormalizedResult(catalog.stats, statNames),
    skills: buildNormalizedResult(catalog.skills, skillNames),
    items: Object.entries(catalog.items).map(([name, expected]) => ({
      name,
      ...(name === "Weapons"
        ? buildWeaponResult(expected, weaponNames)
        : name === "Ammo"
          ? buildAmmoResult(expected, ammoNames)
          : name === "Cyberware"
            ? buildCyberwareResult(expected, cyberwareNames, armorNames)
            : buildResult(expected, name === "Armor" ? armorNames : itemNames))
    }))
  };
}

export function buildCyberwareResult(
  cyberwareNames,
  availableNames,
  availableArmorNames = []
) {
  const expected = [...new Set(cyberwareNames
    .filter((name) => !TECHNICAL_CYBERWARE_NAMES.has(name)))];
  const available = new Set(availableNames);
  const availableArmor = new Set(availableArmorNames);
  const missing = expected.filter((name) => {
    const cyberwareFound = buildCyberwareItemMapping(name).candidates
      .some((candidate) => available.has(candidate));
    const armorName = getCyberwareArmorName(name);
    return !cyberwareFound || (armorName != null && !availableArmor.has(armorName));
  });
  return {
    found: expected.length - missing.length,
    total: expected.length,
    missingCount: missing.length,
    missing
  };
}

export function buildAmmoResult(ammoNames, availableNames) {
  const available = new Set(availableNames);
  const uniqueExpected = [...new Set(ammoNames)];
  const missing = uniqueExpected.filter((name) => !buildAmmoNameCandidates(name)
    .some((candidate) => available.has(candidate)));

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
  const available = new Set(availableNames);
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
    return candidates.some((candidate) => available.has(candidate));
  });
}

function buildResult(expectedNames, availableNames) {
  const uniqueExpected = [...new Set(expectedNames)];
  const available = new Set(availableNames);
  const missing = uniqueExpected.filter((name) => !available.has(name));
  return {
    found: uniqueExpected.length - missing.length,
    total: uniqueExpected.length,
    missingCount: missing.length,
    missing
  };
}

function buildNormalizedResult(expectedNames, availableNames) {
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
