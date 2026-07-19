import { registerActorDirectoryHooks } from "./foundry/actor-directory.js";
import {
  registerSettings,
  registerSettingsVisibilityHook
} from "./foundry/settings.js";

registerActorDirectoryHooks();
registerSettingsVisibilityHook();

Hooks.once("init", () => {
  try {
    registerSettings();
  } catch (error) {
    console.error("NPC Generator | Failed to register module settings.", error);
  }
});
