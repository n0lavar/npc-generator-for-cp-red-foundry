import { buildWeaponImportRequests } from "../mapping/item-mapper.js";
import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import { buildCompendiumItemSources } from "./compendium-item-importer.js";

export async function createWeapons(actor, generatedWeapons) {
  const mapping = buildWeaponImportRequests(generatedWeapons);
  if (mapping.requests.length === 0) return { unmatched: mapping.unmatched };

  const result = await buildCompendiumItemSources("weapon", mapping.requests, (source, request) => {
    source.system.equipped = "equipped";
    if (request.skill) source.system.weaponSkill = resolveActorSkillName(actor, request.skill);
  });

  if (result.sources.length > 0) await actor.createEmbeddedDocuments("Item", result.sources);
  return { unmatched: [...mapping.unmatched, ...result.unmatched] };
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
