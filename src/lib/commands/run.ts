import { Mode } from "../../domain/types.js";
import { OpenCodeAdapter } from "../opencode/adapter.js";

export interface RunHandlerOptions {
  mode: Mode;
}

export async function runHandler(options: RunHandlerOptions): Promise<void> {
  const adapter = new OpenCodeAdapter();
  
  const availability = await adapter.checkAvailability();
  if (!availability.available) {
    console.error(availability.error || "OpenCode is not available");
    process.exit(1);
  }

  console.log(`Running ${options.mode} mode`);
  
  // Stub: main loop logic to be implemented
}
