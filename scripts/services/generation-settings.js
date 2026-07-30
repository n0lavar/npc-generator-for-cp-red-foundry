import { MODULE_ID } from "../constants.js";

const SETTINGS_FILE_NAME = "settings.json";
const SETTINGS_EXAMPLE_URL = `modules/${MODULE_ID}/settings.example.json`;
const TOKEN_DISPOSITIONS = new Set([-2, -1, 0, 1]);

/**
 * Loads the persistent generation settings, creating settings.json from the
 * packaged example when it does not exist yet.
 */
export async function loadGenerationSettings() {
  const root = await getStorageRoot();
  if (!root) return loadExampleSettings();

  try {
    const handle = await root.getFileHandle(SETTINGS_FILE_NAME);
    return parseSettings(await (await handle.getFile()).text());
  } catch (error) {
    if (error?.name !== "NotFoundError") throw error;
  }

  const settings = await loadExampleSettings();
  await writeSettings(root, settings);
  return settings;
}

/** Persists changed form values while retaining settings hidden from the UI. */
export async function saveGenerationSettings(values) {
  const root = await getStorageRoot();
  const current = root
    ? await loadSettings(root)
    : await loadExampleSettings();
  const settings = mergeGenerationSettings(current, values);
  if (root) await writeSettings(root, settings);
  return settings;
}

/** Applies settings.json values to generator field defaults. */
export function applyGenerationSettings(fields, settings) {
  return fields.map((field) => {
    const value = readSetting(settings, field.name);
    return value.found ? { ...field, default: value.value } : field;
  });
}

export function readTokenDispositionSetting(settings, fallback = -1) {
  const setting = readSetting(settings, "token_disposition");
  if (!setting.found) return fallback;
  if (!TOKEN_DISPOSITIONS.has(setting.value)) {
    throw new Error("token_disposition must be one of -2, -1, 0, or 1.");
  }
  return setting.value;
}

export function mergeGenerationSettings(settings, values) {
  const merged = { ...settings };

  for (const [name, value] of Object.entries(values)) {
    const key = findSettingKey(merged, name) ?? name;
    merged[key] = value;
  }

  return merged;
}

async function getStorageRoot() {
  if (!navigator.storage?.getDirectory) return null;
  const originRoot = await navigator.storage.getDirectory();
  return originRoot.getDirectoryHandle(MODULE_ID, { create: true });
}

async function loadSettings(root) {
  try {
    const handle = await root.getFileHandle(SETTINGS_FILE_NAME);
    return parseSettings(await (await handle.getFile()).text());
  } catch (error) {
    if (error?.name !== "NotFoundError") throw error;
  }

  return loadExampleSettings();
}

async function loadExampleSettings() {
  const response = await fetch(SETTINGS_EXAMPLE_URL);
  if (!response.ok) {
    throw new Error(`Could not load ${SETTINGS_EXAMPLE_URL}: HTTP ${response.status}`);
  }
  return parseSettings(await response.text());
}

function parseSettings(text) {
  const settings = JSON.parse(text);
  if (!settings || Array.isArray(settings) || typeof settings !== "object") {
    throw new Error(`${SETTINGS_FILE_NAME} must contain a JSON object.`);
  }
  return settings;
}

async function writeSettings(root, settings) {
  const handle = await root.getFileHandle(SETTINGS_FILE_NAME, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(`${JSON.stringify(settings, null, 2)}\n`);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw error;
  }
}

function readSetting(settings, name) {
  const key = findSettingKey(settings, name);
  return key === undefined
    ? { found: false, value: undefined }
    : { found: true, value: settings[key] };
}

function findSettingKey(settings, name) {
  if (Object.hasOwn(settings, name)) return name;
  const hyphenatedName = name.replaceAll("_", "-");
  return Object.hasOwn(settings, hyphenatedName) ? hyphenatedName : undefined;
}
