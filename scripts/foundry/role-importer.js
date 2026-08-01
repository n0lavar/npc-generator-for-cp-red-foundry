import { normalizeDocumentName } from "../mapping/actor-mapper.js";
import {
  collectItemSourceEntries,
  getItemSourceDocument
} from "./item-compendium.js";

export async function createRole(actor, generatedRole) {
  const normalizedRole = normalizeDocumentName(generatedRole);
  const match = (await collectItemSourceEntries(["role"]))
    .find(({ entry }) => normalizeDocumentName(entry.name) === normalizedRole);

  if (!match) return { created: 0, unmatched: [generatedRole] };

  const document = await getItemSourceDocument(match);
  const source = document.toObject();
  delete source._id;

  const created = await actor.createEmbeddedDocuments("Item", [source]);
  return created.length > 0
    ? { created: 1, unmatched: [] }
    : { created: 0, unmatched: [generatedRole] };
}
