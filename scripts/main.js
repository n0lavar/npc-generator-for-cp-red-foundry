import { registerActorDirectoryHooks } from "./foundry/actor-directory.js";

Hooks.once("init", () => {
  registerActorDirectoryHooks();
});
