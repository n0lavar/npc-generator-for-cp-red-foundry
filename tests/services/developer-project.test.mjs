import assert from "node:assert/strict";
import test from "node:test";

import {
  collectDeveloperProject,
  getDeveloperProjectName,
  selectDeveloperProject
} from "../../scripts/services/developer-project.js";

test("selects and reads a Developer project through the Firefox directory input fallback", async () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  const selectedFiles = [
    createFile("cp_red_npc_generator/pyproject.toml", "project"),
    createFile("cp_red_npc_generator/src/generator.py", "source"),
    createFile("cp_red_npc_generator/.git/config", "ignored"),
    createFile("cp_red_npc_generator/notes.txt", "ignored")
  ];

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {}
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => createFileInput(selectedFiles)
    }
  });

  try {
    assert.equal(await selectDeveloperProject(), "cp_red_npc_generator");
    assert.equal(await getDeveloperProjectName(), "cp_red_npc_generator");

    const project = await collectDeveloperProject();
    assert.deepEqual(
      project.files.map((file) => file.path),
      ["pyproject.toml", "src/generator.py"]
    );
    assert.deepEqual(
      await Promise.all(project.files.map((file) => new TextDecoder().decode(file.bytes))),
      ["project", "source"]
    );
    assert.deepEqual(project.transfer, project.files.map((file) => file.bytes));
  } finally {
    restoreGlobal("window", windowDescriptor);
    restoreGlobal("document", documentDescriptor);
  }
});

function createFile(webkitRelativePath, contents) {
  return {
    name: webkitRelativePath.split("/").at(-1),
    webkitRelativePath,
    arrayBuffer: async () => new TextEncoder().encode(contents).buffer
  };
}

function createFileInput(files) {
  const listeners = new Map();
  return {
    files,
    multiple: false,
    type: "",
    webkitdirectory: false,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get("change")();
    }
  };
}

function restoreGlobal(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}
