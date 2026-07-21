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
