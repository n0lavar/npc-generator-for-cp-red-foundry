import { EXECUTION_MODES } from "../constants.js";
import { getExecutionMode } from "../foundry/settings.js";
import { collectDeveloperProject } from "./developer-project.js";
import { isGeneratorWorkerReady } from "./generator-service.js";

export async function buildGeneratorExecution(
  mode = getExecutionMode(),
  { interactive = true } = {}
) {
  const execution = { mode };
  if (mode === EXECUTION_MODES.DEVELOPER && !isGeneratorWorkerReady(mode)) {
    const project = await collectDeveloperProject({ interactive });
    if (!project) return null;
    Object.assign(execution, project);
  }
  return execution;
}
