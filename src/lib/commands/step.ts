import { Mode, createModelConfig } from "../../domain/types.js";
import { AgentType, type AgentAdapter } from "../../domain/agent.js";
import { createAgent, AgentUnavailableError } from "../agents/factory.js";
import { resolvePrompt } from "../prompts/resolver.js";
import { resolveModelPlaceholders } from "../models/resolver.js";

export interface StepHandlerOptions {
  mode: Mode;
  customPrompt?: string;
  permissionPosture?: "allow-all" | "ask";
  smartModel?: string;
  fastModel?: string;
  agent?: AgentType;
  noPrint?: boolean;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  const { mode, customPrompt, permissionPosture = "allow-all", smartModel, fastModel, agent, noPrint = false } = options;

  const modelConfig = createModelConfig(smartModel, fastModel);
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

  console.log(`Running ${mode} mode step`);
  console.log(`Permissions: ${permissionPosture}`);

  if (resolvedAgent === AgentType.ClaudeCode) {
    console.log(`Print mode: ${headless ? "enabled" : "disabled"}`);
  }

  const prompt = await resolvePrompt({ mode, customPrompt });
  const resolvedPrompt = resolveModelPlaceholders(prompt, modelConfig);
  await adapter.runInteractive(resolvedPrompt, modelConfig.smart);
}
