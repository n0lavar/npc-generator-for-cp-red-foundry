import { buildWeaponImportRequests } from "../mapping/item-mapper.js";
import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import { collectCompendiumItemEntries } from "./item-compendium.js";

export async function createWeapons(actor, generatedWeapons) {
  const mapping = buildWeaponImportRequests(generatedWeapons);
  if (mapping.requests.length === 0) return { unmatched: mapping.unmatched };

  const weaponsByName = new Map();
  for (const match of await collectCompendiumItemEntries(["weapon"])) {
    if (!weaponsByName.has(match.entry.name)) weaponsByName.set(match.entry.name, match);
  }
  const sources = [];

  for (const request of mapping.requests) {
    const match = request.candidates
      .map((candidate) => weaponsByName.get(candidate))
      .find(Boolean);
    if (!match) {
      mapping.unmatched.push(request.name);
      continue;
    }

    const weaponDocument = await match.pack.getDocument(match.entry._id);
    const source = weaponDocument.toObject();
    delete source._id;
    source.system.equipped = "equipped";
    if (request.skill) source.system.weaponSkill = resolveActorSkillName(actor, request.skill);
    sources.push(source);
  }

  if (sources.length > 0) await actor.createEmbeddedDocuments("Item", sources);
  return { unmatched: mapping.unmatched };
}

function resolveActorSkillName(actor, generatedSkillName) {
  const normalizedName = normalizeDocumentName(generatedSkillName);
  const skill = (actor.itemTypes.skill ?? [])
    .find((candidate) => normalizeDocumentName(candidate.name) === normalizedName);

  if (!skill) {
    throw new Error(
      `The weapon skill "${generatedSkillName}" was not found among the Actor's embedded skills.`
    );
  }

  return skill.name;
}
