import { Mode } from "../../domain/types.js";
import { OpenCodeAdapter } from "../opencode/adapter.js";

export interface StepHandlerOptions {
  mode: Mode;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  const adapter = new OpenCodeAdapter();
  
  const availability = await adapter.checkAvailability();
  if (!availability.available) {
    console.error(availability.error || "OpenCode is not available");
    process.exit(1);
  }

  const prompt = "TODO: implement prompt resolution";
  const result = await adapter.runWithPrompt(prompt);
  
  if (result.success) {
    console.log(result.output);
  } else {
    console.error(result.error || "Failed to step");
    process.exit(1);
  }
}
