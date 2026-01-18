import { Mode, createModelConfig } from "../../domain/types.js";
import { OpenCodeAdapter } from "../opencode/adapter.js";
import { resolvePrompt } from "../prompts/resolver.js";
import { resolveModelPlaceholders } from "../models/resolver.js";
import type { PermissionPosture } from "./run.js";

export interface StepHandlerOptions {
  mode: Mode;
  customPrompt?: string;
  permissionPosture?: PermissionPosture;
  smartModel?: string;
  fastModel?: string;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  const { mode, customPrompt, permissionPosture = "allow-all", smartModel, fastModel } = options;
   
  const modelConfig = createModelConfig(smartModel, fastModel);
   
  const adapter = new OpenCodeAdapter({ 
    env: { 
      ...process.env,
      OPENCODE_PERMISSION: permissionPosture === "allow-all" ? '{"*":"allow"}' : "ask"
    } 
  });

  const availability = await adapter.checkAvailability();
  if (!availability.available) {
    console.error(availability.error || "OpenCode is not available");
    process.exit(1);
  }

  console.log(`Running ${mode} mode step`);
  console.log(`Permissions: ${permissionPosture}`);

  const prompt = await resolvePrompt({ mode, customPrompt });
  const resolvedPrompt = resolveModelPlaceholders(prompt, modelConfig);
  const result = await adapter.runWithPromptInteractive(resolvedPrompt, modelConfig.smart);

  if (!result.success) {
    console.error(result.error || "Failed to step");
    process.exit(1);
  }
}
