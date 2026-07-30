import { buildWeaponImportRequests } from "../mapping/item-mapper.js";
import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import { buildCompendiumItemSources } from "./compendium-item-importer.js";

export async function createWeapons(actor, generatedWeapons, importedSkillNames = []) {
  const mapping = buildWeaponImportRequests(generatedWeapons);
  if (mapping.requests.length === 0) return { unmatched: mapping.unmatched };

  const result = await buildCompendiumItemSources("weapon", mapping.requests, (source, request) => {
    source.system.equipped = "equipped";
    if (request.skill) {
      source.system.weaponSkill = resolveActorSkillName(
        actor,
        request.skill,
        importedSkillNames
      );
    }
  });

  if (result.sources.length > 0) await actor.createEmbeddedDocuments("Item", result.sources);
  return { unmatched: [...mapping.unmatched, ...result.unmatched] };
}

function resolveActorSkillName(actor, generatedSkillName, importedSkillNames) {
  const normalizedName = normalizeDocumentName(generatedSkillName);
  const actorSkillName = (actor.itemTypes.skill ?? [])
    .find((candidate) => normalizeDocumentName(candidate.name) === normalizedName)
    ?.name;
  const importedSkillName = importedSkillNames
    .find((name) => normalizeDocumentName(name) === normalizedName);
  const skillName = actorSkillName ?? importedSkillName;

  if (!skillName) {
    throw new Error(
      `The weapon skill "${generatedSkillName}" was not found among the Actor's embedded skills.`
    );
  }

  return skillName;
}
