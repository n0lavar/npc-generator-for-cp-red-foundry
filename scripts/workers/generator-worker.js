import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.mjs";

const PYODIDE_BASE_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";
const MODULE_BASE_URL = new URL("../../", self.location.href);
const BUNDLED_WHEEL_URL = new URL(
  "vendor/wheels/cp_red_npc_generator-0.1.0-py3-none-any.whl",
  MODULE_BASE_URL
).href;
const PYTHON_DEPENDENCIES = [
  "dataclass-wizard==0.35.0",
  "result==0.17.0",
  "tzdata==2025.1",
  "Faker==40.31.0",
  "Unidecode==1.4.0"
];

let pyodide;
let initializedMode;

self.addEventListener("message", async (event) => {
  const { id, type, payload } = event.data;

  try {
    if (type === "initialize") {
      await initialize(payload);
      self.postMessage({ id, result: true });
      return;
    }

    if (type === "generate") {
      const result = await generate(payload);
      self.postMessage({ id, result });
      return;
    }

    if (type === "getGenerationOptions") {
      const result = await getGenerationOptions();
      self.postMessage({ id, result });
      return;
    }

    throw new Error(`Unsupported worker message: ${type}`);
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

async function initialize({ mode, files = [] }) {
  if (initializedMode) {
    if (initializedMode !== mode) throw new Error("The generator worker is already initialized.");
    return;
  }

  pyodide = await loadPyodide({ indexURL: PYODIDE_BASE_URL });
  await pyodide.loadPackage(["numpy", "micropip"]);

  if (mode === "bundled") {
    await pyodide.runPythonAsync(`
import micropip
await micropip.install(${JSON.stringify(BUNDLED_WHEEL_URL)})
`);
  } else if (mode === "developer") {
    writeDeveloperFiles(files);
    pyodide.globals.set("dependency_specs_json", JSON.stringify(PYTHON_DEPENDENCIES));
    await pyodide.runPythonAsync(`
import json
import micropip
await micropip.install(json.loads(dependency_specs_json))
`);
    await configureDeveloperImportPath();
  } else {
    throw new Error(`Unknown execution mode: ${mode}`);
  }

  initializedMode = mode;
}

function writeDeveloperFiles(files) {
  pyodide.FS.mkdirTree("/developer-project");

  for (const file of files) {
    const target = `/developer-project/${file.path}`;
    const separator = target.lastIndexOf("/");
    pyodide.FS.mkdirTree(target.slice(0, separator));
    pyodide.FS.writeFile(target, new Uint8Array(file.bytes));
  }
}

async function configureDeveloperImportPath() {
  await pyodide.runPythonAsync(`
import os
import sys

candidates = (
    "/developer-project/npc_generator_for_cp_red/src",
    "/developer-project/src",
    "/developer-project",
)

source_root = next(
    (candidate for candidate in candidates
     if os.path.isfile(os.path.join(candidate, "cp_red_npc_generator", "__init__.py"))),
    None,
)

if source_root is None:
    raise RuntimeError(
        "The selected directory does not contain cp_red_npc_generator/__init__.py "
        "under src or npc_generator_for_cp_red/src."
    )

sys.path.insert(0, source_root)
`);
}

async function generate(options) {
  if (!initializedMode) throw new Error("The generator worker is not initialized.");

  pyodide.globals.set("generation_options_json", JSON.stringify(options));
  return pyodide.runPythonAsync(`
import json
import numpy
from cp_red_npc_generator import GenerationRules, generate_npc

generation_options = json.loads(generation_options_json)
npc = await generate_npc(GenerationRules(**generation_options))
json.dumps(
    npc.to_dict_foundry_vvt(),
    ensure_ascii=False,
    default=lambda value: value.item() if isinstance(value, numpy.generic) else str(value),
)
`);
}

async function getGenerationOptions() {
  if (!initializedMode) throw new Error("The generator worker is not initialized.");

  return pyodide.runPythonAsync(`
import json
from cp_red_npc_generator import get_generation_options

json.dumps({
    "fields": [
        {
            "name": option.name,
            "help": option.help,
            "type": option.type.__name__ if option.type else None,
            "choices": option.choices,
            "default": option.default,
            "group": option.group,
            "boolean": option.boolean,
        }
        for option in get_generation_options().fields
    ]
}, ensure_ascii=False)
`);
}
