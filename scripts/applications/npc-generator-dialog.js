import { MODULE_ID } from "../constants.js";
import { getExecutionMode } from "../foundry/settings.js";
import { createActorFromNpc } from "../foundry/actor-importer.js";
import { buildGeneratorExecution } from "../services/generator-execution.js";
import {
  generateNpc,
  getGenerationOptions
} from "../services/generator-service.js";
import {
  applyGenerationSettings,
  loadGenerationSettings,
  saveGenerationSettings
} from "../services/generation-settings.js";
import { localizeOrFallback } from "../utils/localization.js";
import { redactGenerationSecrets } from "../utils/logging.js";

const VISIBLE_GROUPS = ["NPC Customization", "Generation settings"];

export async function openNpcGeneratorDialog() {
  if (!game.user?.isGM) {
    throw new Error(localizeOrFallback("OnlyGameMaster", "Only a Game Master can generate NPCs."));
  }

  const executionMode = getExecutionMode();
  const options = await getGenerationOptions(
    await buildGeneratorExecution(executionMode)
  );
  const settings = await loadGenerationSettings();
  const fields = applyGenerationSettings(options.fields.map((field) => ({
    ...field,
    nullable: field.default === null
  })), settings);
  const visibleFields = fields.filter((field) => VISIBLE_GROUPS.includes(field.group));
  const forbiddenSkills = readForbiddenSkills(fields);
  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/npc-generator-dialog.hbs`,
    buildViewModel(visibleFields)
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

function buildViewModel(fields) {
  return {
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

  ui.notifications.info(localizeOrFallback("GenerationStarted", "NPC generation started."));

  try {
    const generationOptions = {
      ...readGenerationOptions(form, fields),
      forbidden_skills: [...forbiddenSkills]
    };
    await saveGenerationSettings(generationOptions);
    console.log(
      "NPC Generator | Generation parameters",
      redactGenerationSecrets(generationOptions)
    );
    const resultJson = await generateNpc(
      generationOptions,
      await buildGeneratorExecution(executionMode)
    );
    const result = JSON.parse(resultJson);
    console.log("NPC Generator | Generated NPC", result);
    const actor = await createActorFromNpc(result);
    ui.notifications.info(
      localizeOrFallback("ActorCreated", "Actor created: {name}")
        .replace("{name}", actor.name)
    );
  } catch (error) {
    console.error("NPC Generator | NPC generation failed.", error);
    ui.notifications.error(
      localizeOrFallback("GenerationFailed", "NPC generation failed. See the console.")
    );
  }
}

function registerSettingsPersistence(html, fields) {
  const form = html.find("form")[0];
  if (!form) return;

  let saveTimer;
  form.addEventListener("change", () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      try {
        await saveGenerationSettings(readGenerationOptions(form, fields));
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
