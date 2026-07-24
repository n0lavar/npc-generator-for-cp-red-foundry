import { EXECUTION_MODES, MODULE_ID } from "../constants.js";
import { refreshCompatibilityDefaults } from "../services/compatibility-defaults.js";
import { buildGeneratorExecution } from "../services/generator-execution.js";
import {
  hasGeneratorWorker,
  isGeneratorWorkerReady
} from "../services/generator-service.js";
import { localizeOrFallback } from "../utils/localization.js";
import { createStatusDialog } from "./status-dialog.js";

export class CompatibilityCheck extends FormApplication {
  get title() {
    return localizeOrFallback("CheckCompatibility", "Check compatibility");
  }

  async render() {
    const mode = game.settings.get(MODULE_ID, "executionMode");
    const showStatusDialogs = game.settings.get(MODULE_ID, "showStatusDialogs");
    const needsDeveloperProject = mode === EXECUTION_MODES.DEVELOPER
      && !hasGeneratorWorker(mode);
    const status = createStatusDialog(
      needsDeveloperProject
        ? "StatusReadingDeveloperProject"
        : isGeneratorWorkerReady(mode)
          ? "StatusCheckingCompatibility"
          : "StatusLoadingGenerator",
      needsDeveloperProject
        ? "Selecting and reading Developer project…"
        : isGeneratorWorkerReady(mode)
          ? "Checking generator compatibility…"
          : "Loading generator module…",
      showStatusDialogs
    );

    try {
      const execution = await buildGeneratorExecution();
      if (!execution) {
        status.close();
        return this;
      }
      if (needsDeveloperProject) {
        status.update("StatusLoadingGenerator", "Loading generator module…");
      }
      const report = await refreshCompatibilityDefaults(
        execution,
        (stage) => updateCompatibilityStatus(status, stage)
      );
      logReport(report);
      status.complete(
        "StatusCompatibilityComplete",
        "Compatibility check complete."
      );
      const content = await renderTemplate(
        `modules/${MODULE_ID}/templates/compatibility-report.hbs`,
        buildViewModel(report)
      );
      new Dialog({
        title: this.title,
        content,
        buttons: {
          close: {
            icon: '<i class="fas fa-check"></i>',
            label: localizeOrFallback("Close", "Close")
          }
        },
        default: "close"
      }, { width: 700 }).render(true);
    } catch (error) {
      console.error("NPC Generator | Compatibility check failed.", error);
      status.fail(
        "StatusCompatibilityFailed",
        "Compatibility check failed. See the console."
      );
      if (!showStatusDialogs) {
        ui.notifications.error(
          localizeOrFallback(
            "CompatibilityCheckFailed",
            "Compatibility check failed. See the console."
          )
        );
      }
    }

    return this;
  }

  async _updateObject() {}
}

function updateCompatibilityStatus(status, stage) {
  const stages = {
    initializing: ["StatusLoadingGenerator", "Loading generator module…"],
    ready: ["StatusCheckingCompatibility", "Checking generator compatibility…"],
    collectingDocuments: ["StatusCollectingDocuments", "Inspecting Foundry Items…"],
    savingDefaults: ["StatusSavingDefaults", "Saving compatibility defaults…"]
  };
  const phase = stages[stage];
  if (phase) status.update(...phase);
}

function logReport(report) {
  console.group("NPC Generator | Compatibility report");
  logResult("Stats", report.stats);
  logResult("Skills", report.skills);
  console.group("Items");
  for (const item of report.items) {
    logResult(item.name, item);
  }
  console.groupEnd();
  console.groupEnd();
}

function logResult(name, result) {
  console.group(
    `${name}: Found ${result.found}/${result.total} (missing: ${result.missingCount})`
  );
  if (result.missing.length > 0) {
    console.log("Missing:", result.missing);
  }
  console.groupEnd();
}

function buildViewModel(report) {
  return {
    statsLabel: localizeOrFallback("Stats", "Stats"),
    skillsLabel: localizeOrFallback("Skills", "Skills"),
    itemsLabel: localizeOrFallback("Items", "Items"),
    stats: { ...report.stats, summary: formatSummary(report.stats) },
    skills: { ...report.skills, summary: formatSummary(report.skills) },
    items: report.items.map((item) => ({ ...item, summary: formatSummary(item) }))
  };
}

function formatSummary(result) {
  return localizeOrFallback(
    "CompatibilitySummary",
    "Found {found}/{total} (missing: {missing})"
  )
    .replace("{found}", result.found)
    .replace("{total}", result.total)
    .replace("{missing}", result.missingCount);
}
