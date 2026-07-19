export function buildActorName(npc) {
  const parts = [npc?.name, npc?.surname]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim());

  if (parts.length === 0) {
    throw new Error("The generated NPC does not contain a name or surname.");
  }

  return parts.join(" ");
}

export function buildStatUpdate(actorStats, generatedStats) {
  const availableStats = createNameIndex(Object.keys(actorStats ?? {}));
  const update = {};
  const unmatched = [];

  for (const [generatedName, value] of Object.entries(generatedStats ?? {})) {
    const actorStatName = availableStats.get(normalizeName(generatedName));
    if (!actorStatName) {
      unmatched.push(generatedName);
      continue;
    }

    update[`system.stats.${actorStatName}.value`] = value;
    if (Object.hasOwn(actorStats[actorStatName], "max")) {
      update[`system.stats.${actorStatName}.max`] = value;
    }
  }

  return { update, unmatched };
}

export function buildSkillUpdates(actorSkills, generatedSkills) {
  const availableSkills = new Map(
    (actorSkills ?? []).map((skill) => [normalizeName(skill.name), skill])
  );
  const updates = [];
  const unmatched = [];

  for (const [generatedName, level] of Object.entries(generatedSkills ?? {})) {
    const skill = availableSkills.get(normalizeName(generatedName));
    if (!skill) {
      unmatched.push(generatedName);
      continue;
    }

    updates.push({ _id: skill.id, "system.level": level });
  }

  return { updates, unmatched };
}

function createNameIndex(names) {
  return new Map(names.map((name) => [normalizeName(name), name]));
}

function normalizeName(name) {
  return String(name).normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}
