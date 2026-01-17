import { Mode, type SessionState } from "../../domain/types.js";
import { OpenCodeAdapter } from "../opencode/adapter.js";
import { resolvePrompt } from "../prompts/resolver.js";
import { readSessionsFile, writeSessionsFile } from "../state/index.js";

const COMPLETION_PROMISE = "<promise>COMPLETE</promise>";

export type PermissionPosture = "allow-all" | "ask";

export interface RunHandlerOptions {
  mode: Mode;
  maxIterations?: number;
  permissionPosture?: PermissionPosture;
}

export async function runHandler(options: RunHandlerOptions): Promise<void> {
  const { mode, maxIterations = 10, permissionPosture = "allow-all" } = options;
  
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

  console.log(`Running ${mode} mode`);
  console.log(`Permissions: ${permissionPosture}`);

  let iteration = 1;
  let completed = false;
  const sessions = await readSessionsFile();

  try {
    while (iteration <= maxIterations && !completed) {
      const prompt = await resolvePrompt({ mode });
      const result = await adapter.run(prompt);
      
      if (!result.success) {
        console.error(result.error || "Failed to run iteration");
        process.exit(1);
      }

      const sessionId = result.sessionId || `unknown-${iteration}`;
      console.log(`\n--- Iteration ${iteration}/${maxIterations} (Session: ${sessionId}) ---`);
      console.log(result.output);

      const sessionState: SessionState = {
        iteration,
        sessionId,
        startedAt: new Date().toISOString(),
        mode,
        prompt,
      };
      sessions.push(sessionState);
      await writeSessionsFile(sessions);

      if (result.output.includes(COMPLETION_PROMISE)) {
        console.log(`\n--- Iteration ${iteration}/${maxIterations} Complete (Session: ${sessionId}) ---`);
        console.log(`\n✓ Completed in ${iteration} iteration(s)`);
        completed = true;
      } else if (iteration >= maxIterations) {
        console.log(`\n--- Iteration ${iteration}/${maxIterations} Complete (Session: ${sessionId}) ---`);
        console.log(`\n⚠ Stopped at maximum iterations (${maxIterations}) without completion`);
      } else {
        console.log(`\n--- Iteration ${iteration}/${maxIterations} Complete (Session: ${sessionId}) ---`);
      }

      iteration++;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("\n⚠ Loop interrupted by user");
    } else {
      throw error;
    }
  }
}
