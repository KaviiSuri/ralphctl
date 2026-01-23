import { Mode, type ModelConfig, createModelConfig } from "../../domain/types.js";
import { AgentType, type AgentAdapter } from "../../domain/agent.js";
import { createAgent, AgentUnavailableError } from "../agents/factory.js";
import { resolvePrompt } from "../prompts/resolver.js";
import { resolveModelPlaceholders } from "../models/resolver.js";
import { resolveProjectPaths, validateProject } from "../projects/validation.js";

export interface StepHandlerOptions {
  mode: Mode;
  project?: string;
  customPrompt?: string;
  permissionPosture?: "allow-all" | "ask";
  smartModel?: string;
  fastModel?: string;
  agent?: AgentType;
  noPrint?: boolean;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  const { mode, project, customPrompt, permissionPosture = "allow-all", smartModel, fastModel, agent, noPrint = false } = options;

  // Validate and resolve project paths
  let projectContext: { projectName?: string };
  try {
    const paths = resolveProjectPaths(project);
    projectContext = { projectName: paths.projectName };

    // Show warnings if project validation found issues
    if (project) {
      const validation = validateProject(project);
      if (validation.warnings) {
        for (const warning of validation.warnings) {
          console.warn(`⚠ ${warning}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  // Note: step uses runInteractive which doesn't return session info,
  // so we cannot track step sessions in ralph-sessions.json.
  // The --project flag is still useful for prompt placeholder resolution.

  const headless = !noPrint;
  const resolvedAgent = agent ?? AgentType.OpenCode;

  let adapter: AgentAdapter;
  try {
    adapter = await createAgent(resolvedAgent, {
      permissionPosture,
      env: { ...process.env } as Record<string, string>,
      headless,
    });
  } catch (error) {
    if (error instanceof AgentUnavailableError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const adapterDefaults = adapter.getDefaultModels();
  const modelConfig: ModelConfig = createModelConfig(
    smartModel ?? adapterDefaults.smart,
    fastModel ?? adapterDefaults.fast
  );

  console.log(`Running ${mode} mode step${project ? ` (project: ${project})` : ""}`);
  console.log(`Permissions: ${permissionPosture}`);

  if (resolvedAgent === AgentType.ClaudeCode) {
    console.log(`Print mode: ${headless ? "enabled" : "disabled"}`);
  }

  const prompt = await resolvePrompt({ mode, project, customPrompt });
  const resolvedPrompt = resolveModelPlaceholders(prompt, modelConfig);
  await adapter.runInteractive(resolvedPrompt, modelConfig.smart);
}
