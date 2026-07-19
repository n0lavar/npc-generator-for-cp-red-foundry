import { EXECUTION_MODES, MODULE_ID } from "../constants.js";
import { getExecutionMode } from "../foundry/settings.js";
import { collectDeveloperProject } from "../services/developer-project.js";
import {
  generateNpc,
  getGenerationOptions,
  isGeneratorWorkerReady
} from "../services/generator-service.js";
import { localizeOrFallback } from "../utils/localization.js";

const VISIBLE_GROUPS = ["NPC Customization", "Generation settings"];

export async function openNpcGeneratorDialog() {
  if (!game.user?.isGM) {
    throw new Error(localizeOrFallback("OnlyGameMaster", "Only a Game Master can generate NPCs."));
  }

  const executionMode = getExecutionMode();
  const options = await getGenerationOptions(await buildExecution(executionMode));
  const visibleFields = options.fields.filter((field) => VISIBLE_GROUPS.includes(field.group));
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
          callback: (html) => handleCreateActor(html, executionMode, visibleFields)
        }
      },
      default: "create"
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
  const nullable = field.default === null;

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

async function handleCreateActor(html, executionMode, fields) {
  if (!game.user?.isGM) {
    ui.notifications.error(localizeOrFallback("OnlyGameMaster", "Only a Game Master can generate NPCs."));
    return;
  }

  const form = html.find("form")[0];
  if (!form) throw new Error("The generator form was not found.");

  ui.notifications.info(localizeOrFallback("GenerationStarted", "NPC generation started."));

  try {
    const resultJson = await generateNpc(
      readGenerationOptions(form, fields),
      await buildExecution(executionMode)
    );
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

function readGenerationOptions(form, fields) {
  const formData = new FormData(form);
  return Object.fromEntries(fields.map((field) => {
    if (field.boolean) return [field.name, formData.has(field.name)];

    const value = formData.get(field.name);
    if (value === "" && field.default === null) return [field.name, null];
    if (field.type === "int") return [field.name, Number.parseInt(value, 10)];
    return [field.name, value];
  }));
}

async function buildExecution(executionMode) {
  const execution = { mode: executionMode };
  if (
    executionMode === EXECUTION_MODES.DEVELOPER
    && !isGeneratorWorkerReady(executionMode)
  ) {
    Object.assign(execution, await collectDeveloperProject());
  }
  return execution;
}

function humanize(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
