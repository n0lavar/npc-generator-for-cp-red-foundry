import { openNpcGeneratorDialog } from "../applications/npc-generator-dialog.js";
import { localizeOrFallback } from "../utils/localization.js";

const BUTTON_CLASS = "npc-generator-generate";

export function registerActorDirectoryHooks() {
  Hooks.on("renderActorDirectory", (_application, html) => {
    addGenerateNpcButton(html);
  });
}

function addGenerateNpcButton(html) {
  if (!game.user?.isGM) return;
  if (html.find(`.${BUTTON_CLASS}`).length > 0) return;

  const createFolderButton = html.find("button.create-folder").first();
  if (createFolderButton.length === 0) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add(BUTTON_CLASS);
  button.dataset.action = "generateNpc";

  const icon = document.createElement("i");
  icon.classList.add("fas", "fa-user-plus");
  icon.setAttribute("aria-hidden", "true");

  button.append(
    icon,
    document.createTextNode(localizeOrFallback("GenerateNpc", "Generate NPC"))
  );
  button.addEventListener("click", async () => {
    try {
      await openNpcGeneratorDialog();
    } catch (error) {
      console.error("NPC Generator | Failed to open the generator dialog.", error);
      ui.notifications.error(
        localizeOrFallback(
          "DialogError",
          "The NPC generator dialog could not be opened."
        )
      );
    }
  });

  createFolderButton.before(button);
}
