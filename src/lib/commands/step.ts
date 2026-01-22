import { Mode, createModelConfig } from "../../domain/types.js";
import { AgentType } from "../../domain/agent.js";
import { createAgent } from "../agents/factory.js";
import { resolvePrompt } from "../prompts/resolver.js";
import { resolveModelPlaceholders } from "../models/resolver.js";

export interface StepHandlerOptions {
  mode: Mode;
  customPrompt?: string;
  permissionPosture?: "allow-all" | "ask";
  smartModel?: string;
  fastModel?: string;
  agent?: AgentType;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  const { mode, customPrompt, permissionPosture = "allow-all", smartModel, fastModel, agent } = options;

  const modelConfig = createModelConfig(smartModel, fastModel);

  const adapter = await createAgent(agent, {
    permissionPosture,
    env: { ...process.env } as Record<string, string>,
  });

  console.log(`Running ${mode} mode step`);
  console.log(`Permissions: ${permissionPosture}`);

  const prompt = await resolvePrompt({ mode, customPrompt });
  const resolvedPrompt = resolveModelPlaceholders(prompt, modelConfig);
  await adapter.runInteractive(resolvedPrompt, modelConfig.smart);
}
