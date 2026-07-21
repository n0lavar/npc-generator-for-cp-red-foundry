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
