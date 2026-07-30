import { resetGeneratorWorker } from "./generator-service.js";

const DATABASE_NAME = "npc-generator-for-cp-red-foundry";
const STORE_NAME = "file-system-handles";
const HANDLE_KEY = "generator-project";
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".idea",
  ".venv",
  "__pycache__",
  "build",
  "dist",
  "venv"
]);
const INCLUDED_EXTENSIONS = new Set([".json", ".md", ".py", ".toml"]);

let cachedHandle;
let cachedFileSelection;

export async function selectDeveloperProject() {
  if ("showDirectoryPicker" in window) {
    cachedHandle = await window.showDirectoryPicker({
      id: "cp-red-npc-generator-project",
      mode: "read"
    });
    cachedFileSelection = undefined;
    await storeHandle(cachedHandle);
    resetGeneratorWorker();
    return cachedHandle.name;
  }

  cachedFileSelection = await selectDirectoryFiles();
  cachedHandle = undefined;
  resetGeneratorWorker();
  return cachedFileSelection.name;
}

export async function getDeveloperProjectName() {
  if (cachedFileSelection) return cachedFileSelection.name;
  const handle = await getStoredHandle();
  return handle?.name ?? null;
}

export async function collectDeveloperProject({ interactive = true } = {}) {
  if (cachedFileSelection) {
    return buildSelectedFileProject(cachedFileSelection.files);
  }

  let handle = await getStoredHandle();
  if (!handle) {
    if (!interactive) return null;
    await selectDeveloperProject();
    if (cachedFileSelection) {
      return buildSelectedFileProject(cachedFileSelection.files);
    }
    handle = cachedHandle;
  }

  let permission = await handle.queryPermission({ mode: "read" });
  if (permission === "prompt" && interactive) {
    permission = await handle.requestPermission({ mode: "read" });
  }

  if (permission !== "granted") {
    if (!interactive) return null;
    await selectDeveloperProject();
    handle = cachedHandle;
  }

  const files = [];
  try {
    await collectDirectory(handle, "", files);
  } catch (error) {
    if (error?.name === "NotAllowedError") {
      throw new Error("Access to the selected generator project directory was denied.");
    }
    throw error;
  }

  if (files.length === 0) {
    throw new Error("The selected generator project does not contain supported source files.");
  }

  return {
    files,
    transfer: files.map((file) => file.bytes)
  };
}

async function selectDirectoryFiles() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.webkitdirectory = true;

  const files = await new Promise((resolve, reject) => {
    input.addEventListener("change", () => resolve(Array.from(input.files ?? [])), {
      once: true
    });
    input.addEventListener("cancel", () => reject(createAbortError()), {
      once: true
    });
    input.click();
  });

  if (files.length === 0) throw createAbortError();
  const firstPath = getSelectedRelativePath(files[0]);
  return {
    name: firstPath.split("/")[0] || files[0].name,
    files
  };
}

async function buildSelectedFileProject(selectedFiles) {
  const files = [];

  for (const file of selectedFiles) {
    const pathParts = getSelectedRelativePath(file).split("/").filter(Boolean);
    const relativeParts = pathParts.length > 1 ? pathParts.slice(1) : pathParts;
    if (relativeParts.some((part) => EXCLUDED_DIRECTORIES.has(part))) continue;

    const path = relativeParts.join("/");
    if (!INCLUDED_EXTENSIONS.has(getExtension(path))) continue;
    files.push({
      path,
      bytes: await file.arrayBuffer()
    });
  }

  if (files.length === 0) {
    throw new Error("The selected generator project does not contain supported source files.");
  }

  return {
    files,
    transfer: files.map((file) => file.bytes)
  };
}

function getSelectedRelativePath(file) {
  return (file.webkitRelativePath || file.name).replaceAll("\\", "/");
}

function createAbortError() {
  return new DOMException("Directory selection was canceled.", "AbortError");
}

async function collectDirectory(handle, parentPath, files) {
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === "directory") {
      if (EXCLUDED_DIRECTORIES.has(name)) continue;
      await collectDirectory(entry, joinPath(parentPath, name), files);
      continue;
    }

    if (!INCLUDED_EXTENSIONS.has(getExtension(name))) continue;
    const file = await entry.getFile();
    files.push({
      path: joinPath(parentPath, name),
      bytes: await file.arrayBuffer()
    });
  }
}

function joinPath(parent, name) {
  return parent ? `${parent}/${name}` : name;
}

function getExtension(name) {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index).toLowerCase();
}

async function getStoredHandle() {
  if (cachedHandle) return cachedHandle;
  cachedHandle = await readHandle();
  return cachedHandle;
}

async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function storeHandle(handle) {
  const database = await openDatabase();
  await runTransaction(database, "readwrite", (store) => store.put(handle, HANDLE_KEY));
  database.close();
}

async function readHandle() {
  const database = await openDatabase();
  const handle = await runTransaction(database, "readonly", (store) => store.get(HANDLE_KEY));
  database.close();
  return handle;
}

function runTransaction(database, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}
