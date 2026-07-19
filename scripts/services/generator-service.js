import { MODULE_ID } from "../constants.js";

const WORKER_URL = `modules/${MODULE_ID}/scripts/workers/generator-worker.js`;

let generatorWorker;
let workerInitialization;
let workerMode;
let generationQueue = Promise.resolve();

export async function generateNpc(options, execution) {
  return enqueueWorkerCommand("generate", options, execution);
}

export async function getGenerationOptions(execution) {
  const result = await enqueueWorkerCommand("getGenerationOptions", null, execution);
  return JSON.parse(result);
}

function enqueueWorkerCommand(command, payload, execution) {
  const run = () => runWithPersistentWorker(command, payload, execution);

  const generation = generationQueue.then(run, run);
  generationQueue = generation.catch(() => undefined);
  return generation;
}

async function runWithPersistentWorker(command, payload, execution) {
  if (generatorWorker && workerMode !== execution.mode) {
    resetGeneratorWorker();
  }

  if (!generatorWorker) {
    generatorWorker = new Worker(WORKER_URL, { type: "module" });
    workerMode = execution.mode;
    workerInitialization = callWorker(
      generatorWorker,
      "initialize",
      execution,
      execution.transfer ?? []
    )
      .catch((error) => {
        resetGeneratorWorker();
        throw error;
      });
  }

  await workerInitialization;
  return callWorker(generatorWorker, command, payload);
}

export function resetGeneratorWorker() {
  generatorWorker?.terminate();
  generatorWorker = undefined;
  workerInitialization = undefined;
  workerMode = undefined;
}

export function isGeneratorWorkerReady(mode) {
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
