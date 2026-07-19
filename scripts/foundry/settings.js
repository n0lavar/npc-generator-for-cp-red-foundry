import { EXECUTION_MODES, MODULE_ID } from "../constants.js";
import { localizeOrFallback } from "../utils/localization.js";

export function registerSettings() {
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
}

export function registerSettingsVisibilityHook() {
  Hooks.on("renderSettingsConfig", (_application, html) => {
    if (game.user?.isGM) return;

    html
      .find(`[name="${MODULE_ID}.executionMode"]`)
      .closest(".form-group")
      .remove();
  });
}

export function getExecutionMode() {
  return game.settings.get(MODULE_ID, "executionMode");
}
