import { MODULE_ID } from "../constants.js";

const WORKER_URL = `modules/${MODULE_ID}/scripts/workers/generator-worker.js`;

let generatorWorker;
let workerInitialization;
let workerMode;
let workerReady = false;
let generationQueue = Promise.resolve();

export async function generateNpc(options, execution, onProgress) {
  return enqueueWorkerCommand("generate", options, execution, onProgress);
}

export async function getGenerationOptions(execution, onProgress) {
  const result = await enqueueWorkerCommand(
    "getGenerationOptions",
    null,
    execution,
    onProgress
  );
  return JSON.parse(result);
}

export async function getCompatibilityCatalog(execution, onProgress) {
  const result = await enqueueWorkerCommand(
    "getCompatibilityCatalog",
    null,
    execution,
    onProgress
  );
  return JSON.parse(result);
}

function enqueueWorkerCommand(command, payload, execution, onProgress) {
  const run = () => runWithPersistentWorker(command, payload, execution, onProgress);

  const generation = generationQueue.then(run, run);
  generationQueue = generation.catch(() => undefined);
  return generation;
}

async function runWithPersistentWorker(command, payload, execution, onProgress) {
  if (generatorWorker && workerMode !== execution.mode) {
    resetGeneratorWorker();
  }

  if (!generatorWorker) {
    onProgress?.("initializing");
    generatorWorker = new Worker(WORKER_URL, { type: "module" });
    workerMode = execution.mode;
    workerInitialization = callWorker(
      generatorWorker,
      "initialize",
      execution,
      execution.transfer ?? []
    )
      .then((result) => {
        workerReady = true;
        return result;
      })
      .catch((error) => {
        resetGeneratorWorker();
        throw error;
      });
  }

  await workerInitialization;
  onProgress?.("ready");
  return callWorker(generatorWorker, command, payload);
}

export function resetGeneratorWorker() {
  generatorWorker?.terminate();
  generatorWorker = undefined;
  workerInitialization = undefined;
  workerMode = undefined;
  workerReady = false;
}

export function isGeneratorWorkerReady(mode) {
  return Boolean(generatorWorker && workerReady && workerMode === mode);
}

export function hasGeneratorWorker(mode) {
  return Boolean(generatorWorker && workerInitialization && workerMode === mode);
}

function callWorker(worker, type, payload, transfer = []) {
  const id = foundry.utils.randomID();

  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      if (event.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);

      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data.result);
      }
    };

    const onError = (event) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(new Error(event.message || "The generator worker failed."));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ id, type, payload }, transfer);
  });
}
