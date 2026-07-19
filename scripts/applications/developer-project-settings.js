import { selectDeveloperProject } from "../services/developer-project.js";
import { localizeOrFallback } from "../utils/localization.js";

export class DeveloperProjectSettings extends FormApplication {
  get title() {
    return localizeOrFallback("DeveloperProject", "Generator project");
  }

  async render() {
    try {
      const projectName = await selectDeveloperProject();
      ui.notifications.info(
        localizeOrFallback("ProjectSelected", "Generator project selected: {name}")
          .replace("{name}", projectName)
      );
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("NPC Generator | Failed to select the developer project.", error);
        ui.notifications.error(error.message);
      }
    }

    return this;
  }

  async _updateObject() {}
}
