import { Mode } from "../../domain/types.js";
import { OpenCodeAdapter } from "../opencode/adapter.js";
import { resolvePrompt } from "../prompts/resolver.js";
import type { PermissionPosture } from "./run.js";

export interface StepHandlerOptions {
  mode: Mode;
  customPrompt?: string;
  permissionPosture?: PermissionPosture;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  const { mode, customPrompt, permissionPosture = "allow-all" } = options;
  
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
  const result = await adapter.runWithPromptInteractive(prompt);

  if (!result.success) {
    console.error(result.error || "Failed to step");
    process.exit(1);
  }
}
