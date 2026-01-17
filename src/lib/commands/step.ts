import { Mode } from "../../domain/types.js";

export interface StepHandlerOptions {
  mode: Mode;
}

export async function stepHandler(options: StepHandlerOptions): Promise<void> {
  console.log(`Stepping in ${options.mode} mode (not yet implemented)`);
}
