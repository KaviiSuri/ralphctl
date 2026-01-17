import { Mode } from "../../domain/types.js";

export interface RunHandlerOptions {
  mode: Mode;
}

export async function runHandler(options: RunHandlerOptions): Promise<void> {
  console.log(`Running ${options.mode} mode (not yet implemented)`);
}
