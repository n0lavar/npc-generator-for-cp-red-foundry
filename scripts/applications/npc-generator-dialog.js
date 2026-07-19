import { EXECUTION_MODES, MODULE_ID } from "../constants.js";
import { getExecutionMode } from "../foundry/settings.js";
import {
  collectDeveloperProject,
  getDeveloperProjectName,
  selectDeveloperProject
} from "../services/developer-project.js";
import { generateNpc } from "../services/generator-service.js";
import { localizeOrFallback } from "../utils/localization.js";

const RANKS = [
  "private",
  "corporal",
  "lieutenant",
  "captain",
  "lieutenant_colonel",
  "lieutenant_general",
  "general"
];

const ROLES = [
  "rockerboy",
  "solo",
  "netrunner",
  "tech",
  "medtech",
  "media",
  "exec",
  "lawman",
  "fixer",
  "nomad",
  "civilian"
];

const NATIONALITIES = [
  "en_US", "es_MX", "ja_JP", "zh_CN", "ru_RU", "vi_VN", "es_CO",
  "pt_BR", "ko_KR", "id_ID", "es_CA", "fr_CA", "es_AR", "de_DE",
  "en_GB", "es_CL", "en_PK", "fr_FR", "uk_UA", "it_IT", "es_ES",
  "bn_BD", "pl_PL", "en_IN", "gu_IN", "hi_IN", "mr_IN", "or_IN",
  "ta_IN", "en_NZ", "tr_TR", "en_TH", "th_TH", "nl_NL", "zu_ZA",
  "pt_PT", "ne_NP", "ro_RO", "fa_IR", "sv_SE", "de_AT", "en_KE",
  "cs_CZ", "uz_UZ", "el_GR", "tw_GH", "hu_HU", "da_DK", "no_NO",
  "ar_SA", "fi_FI", "bg_BG", "az_AZ", "he_IL", "sk_SK", "en_NG",
  "ha_NG", "ig_NG", "yo_NG", "fr_BE", "nl_BE", "de_CH", "fr_CH",
  "hr_HR", "ka_GE", "en_IE", "ga_IE", "lt_LT", "hy_AM", "ar_DZ",
  "fr_DZ", "lv_LV", "sl_SI", "et_EE", "ar_PS", "mk_MK", "de_LU",
  "is_IS", "de_LI", "zh_TW"
];

const BOOLEAN_OPTIONS = [
  ["allow-non-basic-ammo", "Allow non-basic ammunition", true],
  ["allow-grenades", "Allow grenades", true],
  ["allow-armor", "Allow armor", true],
  ["allow-cyberware", "Allow cyberware", true],
  ["allow-borgware", "Allow borgware", false],
  ["allow-drugs", "Allow drugs", true],
  ["allow-equipment", "Allow equipment", true],
  ["allow-money", "Allow money", true],
  ["allow-junk", "Allow junk", true],
  ["allow-melee-weapon", "Allow melee weapons", true],
  ["allow-ranged-weapon", "Allow ranged weapons", true],
  ["allow-martial-arts", "Allow martial arts", true]
];

export async function openNpcGeneratorDialog() {
  if (!game.user?.isGM) {
    throw new Error(localizeOrFallback("OnlyGameMaster", "Only a Game Master can generate NPCs."));
  }

  const executionMode = getExecutionMode();
  const developerProjectName = await getDeveloperProjectName();
  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/npc-generator-dialog.hbs`,
    buildViewModel(executionMode, developerProjectName)
  );

  new Dialog(
    {
      title: localizeOrFallback("DialogTitle", "Generate NPC"),
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-user-plus"></i>',
          label: localizeOrFallback("CreateActor", "Create Actor"),
          callback: (html) => handleCreateActor(html, executionMode)
        }
      },
      default: "create",
      render: (html) => activateDeveloperProjectPicker(html)
    },
    { width: 640 }
  ).render(true);
}

function buildViewModel(executionMode, developerProjectName) {
  return {
    npcCustomization: localizeOrFallback("NpcCustomization", "NPC Customization"),
    generationSettings: localizeOrFallback("GenerationSettings", "Generation settings"),
    rankLabel: localizeOrFallback("Rank", "Rank"),
    roleLabel: localizeOrFallback("Role", "Role"),
    nationalityLabel: localizeOrFallback("Nationality", "Nationality"),
    randomLabel: localizeOrFallback("Random", "Random"),
    ranks: buildRankOptions(),
    roles: ROLES.map((value) => ({ value, label: humanize(value), selected: value === "solo" })),
    nationalities: NATIONALITIES.map((value) => ({ value, label: value })),
    booleanOptions: BOOLEAN_OPTIONS.map(([name, fallback, checked]) => ({
      name,
      label: localizeOrFallback(toLocalizationName(name), fallback),
      checked
    })),
    seedLabel: localizeOrFallback("Seed", "Seed"),
    modelIdLabel: localizeOrFallback("ModelId", "Model ID"),
    modelApiKeyLabel: localizeOrFallback("ModelApiKey", "Model API key"),
    modelBaseUrlLabel: localizeOrFallback("ModelBaseUrl", "Model base URL"),
    modelLanguageLabel: localizeOrFallback("ModelLanguage", "Model language"),
    developerMode: executionMode === EXECUTION_MODES.DEVELOPER,
    developerProjectLabel: localizeOrFallback("DeveloperProject", "Generator project"),
    selectProjectLabel: localizeOrFallback("SelectProject", "Select project folder"),
    developerProjectName: developerProjectName ?? localizeOrFallback("NoProjectSelected", "No project selected")
  };
}

function activateDeveloperProjectPicker(html) {
  const button = html.find('[data-action="selectDeveloperProject"]')[0];
  if (!button) return;

  button.addEventListener("click", async () => {
    try {
      const projectName = await selectDeveloperProject();
      html.find('[data-role="developerProjectName"]').text(projectName);
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("NPC Generator | Failed to select the developer project.", error);
      ui.notifications.error(error.message);
    }
  });
}

async function handleCreateActor(html, executionMode) {
  if (!game.user?.isGM) {
    ui.notifications.error(localizeOrFallback("OnlyGameMaster", "Only a Game Master can generate NPCs."));
    return;
  }

  const form = html.find("form")[0];
  if (!form) throw new Error("The generator form was not found.");

  ui.notifications.info(localizeOrFallback("GenerationStarted", "NPC generation started."));

  try {
    const execution = { mode: executionMode };
    if (executionMode === EXECUTION_MODES.DEVELOPER) {
      Object.assign(execution, await collectDeveloperProject());
    }

    const resultJson = await generateNpc(readGenerationOptions(form), execution);
    const result = JSON.parse(resultJson);
    console.log("NPC Generator | Generated NPC", result);
    ui.notifications.info(localizeOrFallback("GenerationComplete", "NPC generation complete. See the console."));
  } catch (error) {
    console.error("NPC Generator | NPC generation failed.", error);
    ui.notifications.error(
      localizeOrFallback("GenerationFailed", "NPC generation failed. See the console.")
    );
  }
}

function readGenerationOptions(form) {
  const formData = new FormData(form);
  const options = Object.fromEntries(
    [...formData.entries()].map(([name, value]) => [name.replaceAll("-", "_"), value])
  );

  for (const [name] of BOOLEAN_OPTIONS) {
    options[name.replaceAll("-", "_")] = formData.has(name);
  }

  options.seed = Number.parseInt(options.seed, 10) || 0;
  for (const name of ["nationality", "model_id", "model_api_key", "model_base_url"]) {
    if (options[name] === "") options[name] = null;
  }

  return options;
}

function buildRankOptions() {
  return RANKS.map((value) => ({
    value,
    label: humanize(value),
    selected: value === "captain"
  }));
}

function humanize(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toLocalizationName(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
