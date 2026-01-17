import { Mode } from "../../domain/types.js";
import { OpenCodeAdapter } from "../opencode/adapter.js";
import { resolvePrompt } from "../prompts/resolver.js";

export interface StepHandlerOptions {
  mode: Mode;
  customPrompt?: string;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  const adapter = new OpenCodeAdapter();
  
  const availability = await adapter.checkAvailability();
  if (!availability.available) {
    console.error(availability.error || "OpenCode is not available");
    process.exit(1);
  }

  console.log(`Running ${options.mode} mode step`);

  const prompt = await resolvePrompt({ mode: options.mode, customPrompt: options.customPrompt });
  const result = await adapter.runWithPrompt(prompt);
  
  if (result.success) {
    console.log(result.output);
  } else {
    console.error(result.error || "Failed to step");
    process.exit(1);
  }
}
