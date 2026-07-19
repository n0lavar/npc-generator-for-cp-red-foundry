const status = document.querySelector("#status");
const worker = new Worker("../../scripts/workers/generator-worker.js", { type: "module" });

try {
  status.textContent = "Initializing Pyodide...";
  await callWorker("initialize", { mode: "bundled" });

  status.textContent = "Generating NPC...";
  const resultJson = await callWorker("generate", {
    rank: "captain",
    role: "solo",
    nationality: "en_US",
    allow_non_basic_ammo: true,
    allow_grenades: true,
    allow_armor: true,
    allow_cyberware: true,
    allow_borgware: false,
    allow_drugs: true,
    allow_equipment: true,
    allow_money: true,
    allow_junk: true,
    allow_melee_weapon: true,
    allow_ranged_weapon: true,
    allow_martial_arts: true,
    seed: 123,
    model_id: null,
    model_api_key: null,
    model_base_url: null,
    model_language: "English"
  });

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
