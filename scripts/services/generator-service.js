import { MODULE_ID } from "../constants.js";

const WORKER_URL = `modules/${MODULE_ID}/scripts/workers/generator-worker.js`;

let bundledWorker;
let bundledInitialization;
let generationQueue = Promise.resolve();

export async function generateNpc(options, execution) {
  const run = () => execution.mode === "bundled"
    ? generateWithBundledWorker(options, execution)
    : generateWithEphemeralWorker(options, execution);

  const generation = generationQueue.then(run, run);
  generationQueue = generation.catch(() => undefined);
  return generation;
}

async function generateWithBundledWorker(options, execution) {
  if (!bundledWorker) {
    bundledWorker = new Worker(WORKER_URL, { type: "module" });
    bundledInitialization = callWorker(bundledWorker, "initialize", execution)
      .catch((error) => {
        bundledWorker?.terminate();
        bundledWorker = undefined;
        bundledInitialization = undefined;
        throw error;
      });
  }

  await bundledInitialization;
  return callWorker(bundledWorker, "generate", options);
}

async function generateWithEphemeralWorker(options, execution) {
  const worker = new Worker(WORKER_URL, { type: "module" });

  try {
    await callWorker(worker, "initialize", execution, execution.transfer ?? []);
    return await callWorker(worker, "generate", options);
  } finally {
    worker.terminate();
  }
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
