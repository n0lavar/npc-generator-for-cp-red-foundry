const status = document.querySelector("#status");
const crossOriginRequests = [];
let worker;

await run();

async function run() {
  const registration = await installNetworkGuard();
  if (!navigator.serviceWorker.controller) {
    status.textContent = "Activating offline network guard...";
    location.reload();
    return;
  }

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "cross-origin-request") {
      crossOriginRequests.push(event.data.url);
    }
  });

  await verifyNetworkGuard();
  worker = new Worker("./offline-generator-worker.js", { type: "module" });

  try {
    status.textContent = "Testing bundled startup without network...";
    await callWorker("initialize", { mode: "bundled" });
    assertNoCrossOriginRequests("module startup");

    status.textContent = "Reading generation options...";
    const options = JSON.parse(await callWorker("getGenerationOptions", null));
    const generationOptions = Object.fromEntries(
      options.fields
        .filter(
          (field) => ["NPC Customization", "Generation settings"].includes(field.group)
        )
        .map((field) => [field.name, field.default])
    );
    generationOptions.seed = 123;
    generationOptions.nationality = "en_US";
    generationOptions.allow_description = false;

    status.textContent = "Testing compatibility check without network...";
    const catalog = JSON.parse(
      await callWorker("getCompatibilityCatalog", null)
    );
    if (
      !catalog.stats.length
      || !catalog.skills.length
      || !Object.keys(catalog.items).length
    ) {
      throw new Error("The compatibility catalog is empty.");
    }
    assertNoCrossOriginRequests("compatibility check");

    status.textContent = "Testing NPC generation without network...";
    const result = JSON.parse(
      await callWorker("generate", generationOptions)
    );
    if (!result.name || !result.stats || !result.inventory) {
      throw new Error("The generated result is missing required NPC fields.");
    }
    if (result.description) {
      throw new Error("AI description generation was not disabled.");
    }

    await waitForNetworkMessages();
    assertNoCrossOriginRequests("NPC generation");
    status.textContent = [
      "PASS",
      "Module startup: no cross-origin requests",
      "Compatibility check: no cross-origin requests",
      "NPC generation: no cross-origin requests"
    ].join("\n");
  } catch (error) {
    status.textContent = `FAIL\n${error.stack ?? error.message ?? String(error)}`;
    console.error(error);
  } finally {
    worker?.terminate();
    await registration.unregister();
  }
}

async function verifyNetworkGuard() {
  const probeUrl = "https://offline-network-probe.invalid/";
  const response = await fetch(probeUrl);
  await waitForNetworkMessages();
  if (
    response.status !== 502
    || crossOriginRequests.length !== 1
    || crossOriginRequests[0] !== probeUrl
  ) {
    throw new Error("The offline network guard did not intercept its test request.");
  }
  crossOriginRequests.length = 0;
}

async function installNetworkGuard() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser does not support Service Workers.");
  }
  const registration = await navigator.serviceWorker.register(
    "./network-guard-service-worker.js",
    { scope: "./" }
  );
  await navigator.serviceWorker.ready;
  return registration;
}

function assertNoCrossOriginRequests(stage) {
  if (!crossOriginRequests.length) return;
  throw new Error(
    `Cross-origin request during ${stage}: ${crossOriginRequests.join(", ")}`
  );
}

function waitForNetworkMessages() {
  return new Promise((resolve) => setTimeout(resolve, 100));
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
