import { registerActorDirectoryHooks } from "./foundry/actor-directory.js";
import {
  registerSettings,
  registerSettingsVisibilityHook
} from "./foundry/settings.js";
import { refreshCompatibilityDefaults } from "./services/compatibility-defaults.js";
import { buildGeneratorExecution } from "./services/generator-execution.js";

registerActorDirectoryHooks();
registerSettingsVisibilityHook();

Hooks.once("init", () => {
  try {
    registerSettings();
  } catch (error) {
    console.error("NPC Generator | Failed to register module settings.", error);
  }
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;

  try {
    await refreshCompatibilityDefaults(await buildGeneratorExecution());
  } catch (error) {
    console.error(
      "NPC Generator | Automatic compatibility check failed.",
      error
    );
  }
});
