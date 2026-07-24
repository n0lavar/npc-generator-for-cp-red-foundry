import { MODULE_ID } from "../constants.js";
import {
  getExecutionMode,
  getOpenCreatedNpc,
  getShowStatusDialogs
} from "../foundry/settings.js";
import { createActorFromNpc } from "../foundry/actor-importer.js";
import { buildGeneratorExecution } from "../services/generator-execution.js";
import {
  generateNpc,
  getGenerationOptions,
  isGeneratorWorkerReady
} from "../services/generator-service.js";
import {
  applyGenerationSettings,
  loadGenerationSettings,
  readTokenDispositionSetting,
  saveGenerationSettings
} from "../services/generation-settings.js";
import { localizeOrFallback } from "../utils/localization.js";
import { redactGenerationSecrets } from "../utils/logging.js";
import { createStatusDialog } from "./status-dialog.js";

const VISIBLE_GROUPS = ["NPC Customization", "Generation settings"];
const DEFAULT_TOKEN_DISPOSITION = -1;

export async function openNpcGeneratorDialog() {
  if (!game.user?.isGM) {
    throw new Error(localizeOrFallback("OnlyGameMaster", "Only a Game Master can generate NPCs."));
  }

  const executionMode = getExecutionMode();
  const execution = await buildGeneratorExecution(executionMode);
  const needsLoadingStatus = !isGeneratorWorkerReady(executionMode);
  const loadingStatus = needsLoadingStatus
    ? createStatusDialog(
      "StatusLoadingGenerator",
      "Loading generator module…",
      getShowStatusDialogs()
    )
    : null;
  let options;
  try {
    options = await getGenerationOptions(execution, (stage) => {
      if (stage === "ready") {
        loadingStatus?.update("StatusGeneratorReady", "Generator module loaded.");
      }
    });
    loadingStatus?.complete("StatusGeneratorReady", "Generator module loaded.");
  } catch (error) {
    loadingStatus?.fail(
      "StatusGeneratorLoadFailed",
      "Generator module could not be loaded. See the console."
    );
    throw error;
  }
  const settings = await loadGenerationSettings();
  const fields = applyGenerationSettings(options.fields.map((field) => ({
    ...field,
    nullable: field.default === null
  })), settings);
  const visibleFields = fields.filter((field) => VISIBLE_GROUPS.includes(field.group));
  const forbiddenSkills = readForbiddenSkills(fields);
  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/npc-generator-dialog.hbs`,
    buildViewModel(
      visibleFields,
      readTokenDispositionSetting(settings, DEFAULT_TOKEN_DISPOSITION)
    )
  );

  new Dialog(
    {
      title: localizeOrFallback("DialogTitle", "Generate NPC"),
      content,
      buttons: {
        create: {
          icon: '<i class="fas fa-user-plus"></i>',
          label: localizeOrFallback("CreateActor", "Create Actor"),
          callback: (html) => handleCreateActor(
            html,
            executionMode,
            visibleFields,
            forbiddenSkills
          )
        }
      },
      default: "create",
      render: (html) => registerSettingsPersistence(html, visibleFields)
    },
    { width: 640 }
  ).render(true);
}

function buildViewModel(fields, tokenDisposition) {
  return {
    token: {
      label: localizeOrFallback("TokenDisposition", "Token Disposition"),
      help: localizeOrFallback(
        "TokenDispositionHint",
        "Changes the Prototype Token's Token Disposition. Neutral and Friendly tokens show their name to players. Secret and Hostile tokens hide it."
      ),
      options: [
        ["Secret", -2],
        ["Hostile", -1],
        ["Neutral", 0],
        ["Friendly", 1]
      ].map(([key, value]) => ({
        value,
        label: localizeOrFallback(`TokenDisposition${key}`, key),
        selected: value === tokenDisposition
      }))
    },
    groups: VISIBLE_GROUPS.map((group) => ({
      label: group,
      fields: fields.filter((field) => field.group === group).map(buildFieldViewModel)
    }))
  };
}

function buildFieldViewModel(field) {
  const choices = field.name === "rank"
    ? field.choices?.filter((choice) => !/^\d+$/.test(String(choice)))
    : field.choices;
  const nullable = field.nullable;

  return {
    ...field,
    id: field.name.replaceAll("_", "-"),
    label: humanize(field.name),
    checked: field.default === true,
    hasChoices: Boolean(choices?.length),
    choices: choices?.map((choice) => ({
      value: choice,
      label: humanize(String(choice)),
      selected: choice === field.default
    })),
    nullable,
    nullSelected: nullable,
    randomLabel: localizeOrFallback("Random", "Random"),
    integer: field.type === "int",
    password: field.name.includes("api_key"),
    inputType: getInputType(field),
    value: field.default ?? ""
  };
}

function getInputType(field) {
  if (field.type === "int") return "number";
  if (field.name.includes("api_key")) return "password";
  if (field.name.includes("url")) return "url";
  return "text";
}

function readForbiddenSkills(fields) {
  const value = fields.find((field) => field.name === "forbidden_skills")?.default ?? [];
  if (!Array.isArray(value) || value.some((name) => typeof name !== "string")) {
    throw new Error("The forbidden_skills generation setting must be an array of strings.");
  }
  return value;
}

async function handleCreateActor(html, executionMode, fields, forbiddenSkills) {
  if (!game.user?.isGM) {
    ui.notifications.error(localizeOrFallback("OnlyGameMaster", "Only a Game Master can generate NPCs."));
    return;
  }

  const form = html.find("form")[0];
  if (!form) throw new Error("The generator form was not found.");

  const status = createStatusDialog(
    "StatusGeneratingNpc",
    "Generating NPC…",
    getShowStatusDialogs()
  );

  try {
    const generationOptions = {
      ...readGenerationOptions(form, fields),
      forbidden_skills: [...forbiddenSkills]
    };
    const tokenDisposition = readTokenDisposition(form);
    await saveGenerationSettings({
      ...generationOptions,
      token_disposition: tokenDisposition
    });
    console.log(
      "NPC Generator | Generation parameters",
      redactGenerationSecrets(generationOptions)
    );
    const resultJson = await generateNpc(
      generationOptions,
      await buildGeneratorExecution(executionMode),
      (stage) => {
        if (stage === "initializing") {
          status.update("StatusLoadingGenerator", "Loading generator module…");
        } else if (stage === "ready") {
          status.update("StatusGeneratingNpc", "Generating NPC…");
        }
      }
    );
    status.update("StatusValidatingNpc", "Validating generated NPC…");
    const result = JSON.parse(resultJson);
    console.log("NPC Generator | Generated NPC", result);
    const actor = await createActorFromNpc(result, (stage) => {
      updateImportStatus(status, stage);
    }, tokenDisposition);
    status.complete("StatusActorCreated", "Actor created.");
    if (getOpenCreatedNpc()) actor.sheet.render(true);
  } catch (error) {
    console.error("NPC Generator | NPC generation failed.", error);
    status.fail("StatusGenerationFailed", "NPC generation failed. See the console.");
    if (!getShowStatusDialogs()) {
      ui.notifications.error(
        localizeOrFallback("GenerationFailed", "NPC generation failed. See the console.")
      );
    }
  }
}

function readTokenDisposition(form) {
  const value = Number.parseInt(new FormData(form).get("tokenDisposition"), 10);
  if (![-2, -1, 0, 1].includes(value)) {
    throw new Error(`Unsupported Token Disposition: ${value}.`);
  }
  return value;
}

function updateImportStatus(status, stage) {
  const stages = {
    creatingActor: ["StatusCreatingActor", "Creating Actor…"],
    importingSkills: ["StatusImportingSkills", "Importing skills…"],
    importingRole: ["StatusImportingRole", "Importing role…"],
    updatingActor: ["StatusUpdatingActor", "Updating stats and biography…"],
    importingCyberware: ["StatusImportingCyberware", "Importing cyberware…"],
    importingArmor: ["StatusImportingArmor", "Importing armor…"],
    importingWeapons: ["StatusImportingWeapons", "Importing weapons…"],
    importingInventory: ["StatusImportingInventory", "Importing inventory…"]
  };
  const phase = stages[stage];
  if (phase) status.update(...phase);
}

function registerSettingsPersistence(html, fields) {
  const form = html.find("form")[0];
  if (!form) return;

  let saveTimer;
  form.addEventListener("change", () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      try {
        await saveGenerationSettings({
          ...readGenerationOptions(form, fields),
          token_disposition: readTokenDisposition(form)
        });
      } catch (error) {
        console.error("NPC Generator | Failed to save generation settings.", error);
        ui.notifications.error(
          localizeOrFallback("SettingsSaveFailed", "Generation settings could not be saved.")
        );
      }
    }, 150);
  });
}

function readGenerationOptions(form, fields) {
  const formData = new FormData(form);
  return Object.fromEntries(fields.map((field) => {
    if (field.boolean) return [field.name, formData.has(field.name)];

    const value = formData.get(field.name);
    if (value === "" && field.nullable) return [field.name, null];
    if (field.type === "int") return [field.name, Number.parseInt(value, 10)];
    return [field.name, value];
  }));
}

function humanize(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
