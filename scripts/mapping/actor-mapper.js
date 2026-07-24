export function buildActorName(npc) {
  const parts = [npc?.name, npc?.surname]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim());

  if (parts.length === 0) {
    throw new Error("The generated NPC does not contain a name or surname.");
  }

  return parts.join(" ");
}

const TOKEN_DISPOSITIONS = new Set([-2, -1, 0, 1]);
const VISIBLE_NAME_DISPOSITIONS = new Set([0, 1]);
const TOKEN_DISPLAY_MODES = {
  NONE: 0,
  ALWAYS: 50
};

export function buildPrototypeTokenSource(disposition) {
  if (!TOKEN_DISPOSITIONS.has(disposition)) {
    throw new Error(`Unsupported Token Disposition: ${disposition}.`);
  }

  return {
    disposition,
    displayName: VISIBLE_NAME_DISPOSITIONS.has(disposition)
      ? TOKEN_DISPLAY_MODES.ALWAYS
      : TOKEN_DISPLAY_MODES.NONE
  };
}

export function buildPrototypeTokenUpdate(disposition) {
  const token = buildPrototypeTokenSource(disposition);
  return {
    "prototypeToken.disposition": token.disposition,
    "prototypeToken.displayName": token.displayName
  };
}

const LIFEPATH_FIELDS = {
  personality: "personality",
  clothing_style: "clothingStyle",
  hairstyle: "hairStyle",
  affectation: "affectations",
  value_most: "valueMost",
  feel_about_people: "aboutPeople",
  valued_person: "valuedPerson",
  valued_possession: "valuedPossession",
  family_background: "familyBackground",
  childhood_environment: "childhoodEnvironment",
  family_crisis: "familyCrisis",
  friends: "friends",
  enemies: "enemies",
  tragic_love_affairs: "tragicLoveAffairs",
  life_goal: "lifeGoals"
};

const DEFAULT_LIFEPATH_LABELS = {
  friend: "Relationship to you",
  loveAffair: "What happened",
  enemy: {
    enemy: "Who",
    cause: "Cause",
    wronged_party: "Wronged party",
    resources: "Resources",
    reaction: "Reaction"
  }
};

export function buildActorBiographyUpdate(npc, labels = DEFAULT_LIFEPATH_LABELS) {
  const update = {};
  const lifepath = npc?.lifepath;
  const resolvedLabels = {
    ...DEFAULT_LIFEPATH_LABELS,
    ...labels,
    enemy: {
      ...DEFAULT_LIFEPATH_LABELS.enemy,
      ...labels?.enemy
    }
  };

  if (lifepath && typeof lifepath === "object" && !Array.isArray(lifepath)) {
    const culturalOrigin = [lifepath.cultural_origin, lifepath.language]
      .filter(isNonEmptyString);
    if (culturalOrigin.length > 0) {
      update["system.lifepath.culturalOrigin"] = toParagraphs(culturalOrigin);
    }

    for (const [generatorField, actorField] of Object.entries(LIFEPATH_FIELDS)) {
      const html = formatLifepathValue(
        generatorField,
        lifepath[generatorField],
        resolvedLabels
      );
      if (html) update[`system.lifepath.${actorField}`] = html;
    }
  }

  if (isNonEmptyString(npc?.description)) {
    update["system.information.notes"] = toParagraphs([npc.description]);
  }

  return update;
}

export function buildStatUpdate(actorStats, generatedStats) {
  const availableStats = createNameIndex(Object.keys(actorStats ?? {}));
  const update = {};
  const unmatched = [];

  for (const [generatedName, value] of Object.entries(generatedStats ?? {})) {
    const actorStatName = availableStats.get(normalizeDocumentName(generatedName));
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
    (actorSkills ?? []).map((skill) => [normalizeDocumentName(skill.name), skill])
  );
  const updates = [];
  const unmatched = [];

  for (const [generatedName, level] of Object.entries(generatedSkills ?? {})) {
    const skill = availableSkills.get(normalizeDocumentName(generatedName));
    if (!skill) {
      unmatched.push(generatedName);
      continue;
    }

    updates.push({ _id: skill.id, "system.level": level });
  }

  return { updates, unmatched };
}

function createNameIndex(names) {
  return new Map(names.map((name) => [normalizeDocumentName(name), name]));
}

export function normalizeDocumentName(name) {
  return String(name).normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}

function formatLifepathValue(field, value, labels) {
  if (field === "family_background" && value && typeof value === "object") {
    return toParagraphs([value.name, value.description].filter(isNonEmptyString));
  }
  if (field === "enemies" && Array.isArray(value)) {
    return formatEnemies(value, labels.enemy);
  }
  if (field === "friends" && Array.isArray(value)) {
    return formatDescribedList(value, labels.friend);
  }
  if (field === "tragic_love_affairs" && Array.isArray(value)) {
    return formatDescribedList(value, labels.loveAffair);
  }
  if (Array.isArray(value)) {
    return toList(value.filter(isNonEmptyString));
  }
  return isNonEmptyString(value) ? toParagraphs([value]) : "";
}

function formatEnemies(enemies, labels) {
  const items = enemies.map((enemy) => formatEnemy(enemy, labels)).filter(Boolean);
  return items.length > 0 ? `<ol>${items.join("<br>")}</ol>` : "";
}

function formatEnemy(enemy, labels) {
  if (!enemy || typeof enemy !== "object") return "";

  const descriptions = Object.keys(DEFAULT_LIFEPATH_LABELS.enemy)
    .filter((key) => isNonEmptyString(enemy[key]))
    .map((key) => formatDescription(labels[key], enemy[key]));

  return descriptions.length > 0 ? `<li>${descriptions.join("<br>")}</li>` : "";
}

function formatDescribedList(values, label) {
  const items = values
    .filter(isNonEmptyString)
    .map((value) => `<li>${formatDescription(label, value)}</li>`);
  return items.length > 0 ? `<ol>${items.join("")}</ol>` : "";
}

function formatDescription(label, value) {
  return `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}`;
}

function toParagraphs(values) {
  return values
    .map((value) => `<p>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

function toList(values) {
  if (values.length === 0) return "";
  return `<ol>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ol>`;
}

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function escapeHtml(value) {
  return String(value).trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
