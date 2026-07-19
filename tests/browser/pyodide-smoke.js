const status = document.querySelector("#status");
const worker = new Worker("../../scripts/workers/generator-worker.js", { type: "module" });

try {
  status.textContent = "Initializing Pyodide...";
  await callWorker("initialize", { mode: "bundled" });

  status.textContent = "Reading generation options...";
  const options = JSON.parse(await callWorker("getGenerationOptions", null));
  const generationOptions = Object.fromEntries(
    options.fields
      .filter((field) => ["NPC Customization", "Generation settings"].includes(field.group))
      .map((field) => [field.name, field.default])
  );
  generationOptions.seed = 123;
  generationOptions.nationality = "en_US";
  generationOptions.model_id = null;
  generationOptions.model_api_key = null;
  generationOptions.model_base_url = null;

  status.textContent = "Generating NPC...";
  const resultJson = await callWorker("generate", generationOptions);

  const result = JSON.parse(resultJson);
  if (!result.name || !result.stats || !result.inventory) {
    throw new Error("The generated result is missing required NPC fields.");
  }

  status.textContent = `PASS\n${JSON.stringify(result, null, 2)}`;
} catch (error) {
  status.textContent = `FAIL\n${error.stack ?? error.message ?? String(error)}`;
  console.error(error);
} finally {
  worker.terminate();
}

function callWorker(type, payload) {
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      if (event.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };

    const onError = (event) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(new Error(event.message || "The worker failed."));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ id, type, payload });
  });
}
