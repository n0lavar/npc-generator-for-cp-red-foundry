import { EXECUTION_MODES, MODULE_ID } from "../constants.js";
import { DeveloperProjectSettings } from "../applications/developer-project-settings.js";
import { CompatibilityCheck } from "../applications/compatibility-check.js";
import { localizeOrFallback } from "../utils/localization.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "openCreatedNpc", {
    name: localizeOrFallback("OpenCreatedNpc", "Open created NPC"),
    hint: localizeOrFallback(
      "OpenCreatedNpcHint",
      "Open the NPC character sheet after the Actor is created."
    ),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.registerMenu(MODULE_ID, "compatibilityCheck", {
    name: localizeOrFallback("CheckCompatibility", "Check compatibility"),
    hint: localizeOrFallback(
      "CheckCompatibilityHint",
      "Compare generator stats, skills, and item names with documents available in Foundry."
    ),
    label: localizeOrFallback("CheckCompatibility", "Check compatibility"),
    icon: "fas fa-vial",
    type: CompatibilityCheck,
    restricted: true
  });

  game.settings.register(MODULE_ID, "executionMode", {
    name: localizeOrFallback("ExecutionMode", "Execution mode"),
    hint: localizeOrFallback(
      "ExecutionModeHint",
      "Use the bundled generator or load a local Python project for development."
    ),
    scope: "client",
    config: true,
    type: String,
    choices: {
      [EXECUTION_MODES.BUNDLED]: localizeOrFallback("BundledMode", "Bundled"),
      [EXECUTION_MODES.DEVELOPER]: localizeOrFallback("DeveloperMode", "Developer")
    },
    default: EXECUTION_MODES.BUNDLED
  });

  game.settings.registerMenu(MODULE_ID, "developerProject", {
    name: localizeOrFallback("DeveloperProject", "Generator project"),
    hint: localizeOrFallback(
      "DeveloperProjectHint",
      "Select the local cp_red_npc_generator project used in Developer mode."
    ),
    label: localizeOrFallback("SelectProject", "Select project folder"),
    icon: "fas fa-folder-open",
    type: DeveloperProjectSettings,
    restricted: true
  });
}

export function registerSettingsVisibilityHook() {
  Hooks.on("renderSettingsConfig", (_application, html) => {
    reorderModuleSettings(html);

    if (game.user?.isGM) return;

    html
      .find(`[name="${MODULE_ID}.executionMode"]`)
      .closest(".form-group")
      .remove();
  });
}

function reorderModuleSettings(html) {
  const root = html[0] ?? html;
  const selectors = [
    `[name="${MODULE_ID}.openCreatedNpc"]`,
    `[data-key="${MODULE_ID}.compatibilityCheck"]`,
    `[name="${MODULE_ID}.executionMode"]`,
    `[data-key="${MODULE_ID}.developerProject"]`
  ];
  const groups = selectors
    .map((selector) => root.querySelector(selector)?.closest(".form-group"))
    .filter(Boolean);

  if (groups.length !== selectors.length) return;

  const anchor = groups.reduce((first, group) => (
    first.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_PRECEDING
      ? group
      : first
  ));
  const marker = anchor.ownerDocument.createComment(`${MODULE_ID}-settings-order`);
  anchor.before(marker);
  marker.before(...groups);
  marker.remove();
}

export function getExecutionMode() {
  return game.settings.get(MODULE_ID, "executionMode");
}

export function getOpenCreatedNpc() {
  return game.settings.get(MODULE_ID, "openCreatedNpc");
}
