export function buildArmorImportRequests(generatedArmor) {
  const requests = [];
  const unmatched = [];

  for (const armor of generatedArmor ?? []) {
    const name = typeof armor?.name === "string" ? armor.name.trim() : "";
    if (!name) {
      unmatched.push(armor?.name ?? String(armor));
      continue;
    }

    requests.push({ name, candidates: [name] });
  }

  return { requests, unmatched };
}

const CYBERWARE_STRUCTURAL_CONTAINERS = new Set([
  "Meatbody",
  "Neuralware",
  "Eye Sockets",
  "Auditory System",
  "Shoulders",
  "Hips",
  "Borgware"
]);

const CYBERWARE_NAME_MAPPINGS = new Map([
  ["Fashionware", "Fashionware (7 Option Slots)"],
  ["Internal Cyberware", "Internal (7 Option Slots)"],
  ["External Cyberware", "External (7 Option Slots)"]
]);

const POPUP_CYBERWARE_MAPPINGS = new Map([
  ["Popup Melee Weapon (Light)", { name: "Popup Melee Weapon", weaponType: "lightMelee" }],
  ["Popup Melee Weapon (Medium)", { name: "Popup Melee Weapon", weaponType: "medMelee" }],
  ["Popup Melee Weapon (Heavy)", { name: "Popup Melee Weapon", weaponType: "heavyMelee" }],
  ["Popup Ranged Weapon (Medium Pistol)", { name: "Popup Ranged Weapon", weaponType: "medPistol" }],
  ["Popup Ranged Weapon (Heavy Pistol)", { name: "Popup Ranged Weapon", weaponType: "heavyPistol" }],
  ["Popup Ranged Weapon (Very Heavy Pistol)", { name: "Popup Ranged Weapon", weaponType: "vHeavyPistol" }],
  ["Popup Ranged Weapon (SMG)", { name: "Popup Ranged Weapon", weaponType: "smg" }]
]);

export function buildCyberwareItemMapping(name) {
  const popupMapping = POPUP_CYBERWARE_MAPPINGS.get(name);
  if (popupMapping) {
    return { candidates: [popupMapping.name], weaponType: popupMapping.weaponType };
  }
  return { candidates: [CYBERWARE_NAME_MAPPINGS.get(name) ?? name] };
}

export function buildCyberwareImportRequests(generatedCyberware) {
  const requests = [];
  const unmatched = [];

  if (generatedCyberware == null) return { requests, unmatched };
  if (!Array.isArray(generatedCyberware)) {
    return { requests, unmatched: ["[invalid cyberware root]"] };
  }

  for (const root of generatedCyberware) {
    visitCyberwareNode(root, requests, unmatched, null);
  }
  return { requests, unmatched };
}

function visitCyberwareNode(node, requests, unmatched, parentIndex) {
  if (!node || typeof node !== "object") return;

  const name = cleanName(node.item?.name);
  let childParentIndex = parentIndex;
  if (name && !CYBERWARE_STRUCTURAL_CONTAINERS.has(name)) {
    childParentIndex = requests.length;
    const itemMapping = buildCyberwareItemMapping(name);
    requests.push({
      name,
      ...itemMapping,
      parentIndex
    });
  } else if (node.item && !name) {
    unmatched.push(String(node.item?.name ?? node.item));
  }

  if (node.children == null) return;
  if (!Array.isArray(node.children)) {
    unmatched.push(name || "[invalid cyberware tree]");
    return;
  }

  for (const child of node.children) {
    visitCyberwareNode(child, requests, unmatched, childParentIndex);
  }
}

export function buildAmmoImportRequests(generatedInventory) {
  const requests = [];
  const unmatched = [];

  for (const entry of generatedInventory ?? []) {
    if (entry?.item?.type !== "ammo") continue;

    const name = cleanName(entry.item.name);
    const amount = Number(entry.amount);
    if (!name || !Number.isInteger(amount) || amount <= 0) {
      unmatched.push(name || String(entry?.item?.name ?? entry));
      continue;
    }

    requests.push({ name, candidates: buildAmmoNameCandidates(name), amount });
  }

  return { requests, unmatched };
}

export function buildEquipmentImportRequests(generatedInventory) {
  const requests = [];
  const unmatched = [];

  for (const entry of generatedInventory ?? []) {
    if (entry?.item?.type !== "equipment") continue;

    const name = cleanName(entry.item.name);
    const beautifulName = cleanName(entry.item.beautiful_name);
    const amount = Number(entry.amount);
    if (!name || !Number.isInteger(amount) || amount <= 0) {
      unmatched.push(name || String(entry?.item?.name ?? entry));
      continue;
    }

    requests.push({
      name,
      candidates: [...new Set([beautifulName, name].filter(Boolean))],
      amount
    });
  }

  return { requests, unmatched };
}

export function buildAmmoNameCandidates(name) {
  const cleanedName = cleanName(name);
  const candidates = [cleanedName];
  const match = cleanedName.match(/^(.+?)\s*\((.+)\)$/u);

  if (match && normalizeForComparison(match[1]) === normalizeForComparison(match[2])) {
    candidates.push(match[1].trim());
  }

  return candidates.filter(Boolean);
}

const WEAPON_QUALITIES = new Set(["poor", "standard", "excellent"]);

export function buildWeaponImportRequests(generatedWeapons) {
  const requests = [];
  const unmatched = [];

  for (const weapon of generatedWeapons ?? []) {
    const name = cleanName(weapon?.name);
    const beautifulName = cleanName(weapon?.beautiful_name);
    const quality = cleanName(weapon?.quality).toLowerCase();
    const skill = cleanName(weapon?.skill);

    if (!name || (quality && !WEAPON_QUALITIES.has(quality))) {
      unmatched.push(name || String(weapon));
      continue;
    }

    const candidates = isMartialArtsSkillName(name)
      ? ["Martial Arts"]
      : buildWeaponNameCandidates({ name, beautifulName, quality });

    requests.push({ name, candidates, skill });
  }

  return { requests, unmatched };
}

function isMartialArtsSkillName(name) {
  return /^MartialArts\s*\(.+\)$/u.test(name);
}

export function buildWeaponNameCandidates({ name, beautifulName, quality }) {
  const candidates = [
    beautifulName && quality && `${beautifulName} (${quality})`,
    name && quality && `${name} (${quality})`,
    beautifulName,
    name
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function cleanName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForComparison(value) {
  return value.normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}
