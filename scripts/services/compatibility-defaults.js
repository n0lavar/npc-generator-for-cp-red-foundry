import { checkCompatibility } from "./compatibility-service.js";
import { saveGenerationSettings } from "./generation-settings.js";

export async function refreshCompatibilityDefaults(execution, onProgress) {
  const report = await checkCompatibility(execution, onProgress);
  onProgress?.("savingDefaults");
  await saveGenerationSettings(buildCompatibilityDefaults(report));
  return report;
}

export function buildCompatibilityDefaults(report) {
  const missingSkills = report?.skills?.missing;
  if (
    !Array.isArray(missingSkills)
    || missingSkills.some((name) => typeof name !== "string")
  ) {
    throw new Error("The compatibility report must contain an array of missing skills.");
  }
  return { forbidden_skills: [...missingSkills] };
}
