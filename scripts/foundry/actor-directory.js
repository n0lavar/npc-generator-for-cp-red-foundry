const MODULE_ID = "npc_generator_for_cp_red_foundry";
const BUTTON_CLASS = "npc-generator-generate";

export function registerActorDirectoryHooks() {
  Hooks.on("renderActorDirectory", (_application, html) => {
    addGenerateNpcButton(html);
  });
}

function addGenerateNpcButton(html) {
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
      await openHelloWorldDialog();
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

async function openHelloWorldDialog() {
  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/hello-world-dialog.hbs`,
    { message: localizeOrFallback("HelloWorld", "Hello World") }
  );

  new Dialog({
    title: localizeOrFallback("DialogTitle", "Generate NPC"),
    content,
    buttons: {
      close: {
        icon: '<i class="fas fa-times"></i>',
        label: localizeOrFallback("Close", "Close")
      }
    },
    default: "close"
  }).render(true);
}

function localizeOrFallback(name, fallback) {
  const key = `${MODULE_ID}.${name}`;
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}
