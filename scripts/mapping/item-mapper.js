export function buildArmorImportRequests(generatedArmor) {
  const requests = [];
  const unmatched = [];

  for (const armor of generatedArmor ?? []) {
    const name = typeof armor?.name === "string" ? armor.name.trim() : "";
    if (!name) {
      unmatched.push(armor?.name ?? String(armor));
      continue;
    }

    requests.push({ name });
  }

  return { requests, unmatched };
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
