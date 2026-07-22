import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import { collectCompendiumItemEntries } from "./item-compendium.js";

export async function createRole(actor, generatedRole) {
  const normalizedRole = normalizeDocumentName(generatedRole);
  const match = (await collectCompendiumItemEntries(["role"]))
    .find(({ entry }) => normalizeDocumentName(entry.name) === normalizedRole);

  if (!match) return { created: 0, unmatched: [generatedRole] };

  const document = await match.pack.getDocument(match.entry._id);
  const source = document.toObject();
  delete source._id;

  const created = await actor.createEmbeddedDocuments("Item", [source]);
  return created.length > 0
    ? { created: 1, unmatched: [] }
    : { created: 0, unmatched: [generatedRole] };
}
