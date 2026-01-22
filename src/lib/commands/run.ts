import { Mode, type SessionState, createModelConfig } from "../../domain/types.js";
import { AgentType } from "../../domain/agent.js";
import { createAgent } from "../agents/factory.js";
import { resolvePrompt } from "../prompts/resolver.js";
import { resolveModelPlaceholders } from "../models/resolver.js";
import { readSessionsFile, writeSessionsFile } from "../state/index.js";

export interface RunHandlerOptions {
  mode: Mode;
  maxIterations?: number;
  permissionPosture?: "allow-all" | "ask";
  smartModel?: string;
  fastModel?: string;
  agent?: AgentType;
  noPrint?: boolean;
}

export async function runHandler(options: RunHandlerOptions): Promise<void> {
  const { mode, maxIterations = 10, permissionPosture = "allow-all", smartModel, fastModel, agent, noPrint = false } = options;

  const modelConfig = createModelConfig(smartModel, fastModel);
  const headless = !noPrint;

  const adapter = await createAgent(agent, {
    permissionPosture,
    env: { ...process.env } as Record<string, string>,
    headless,
  });

  console.log(`Running ${mode} mode`);
  console.log(`Permissions: ${permissionPosture}`);

  if (agent === AgentType.ClaudeCode) {
    console.log(`Print mode: ${headless ? "enabled" : "disabled"}`);
  }

  let iteration = 1;
  let completed = false;
  const sessionsFile = await readSessionsFile();
  const agentType = agent || AgentType.OpenCode;

  try {
    while (iteration <= maxIterations && !completed) {
      const prompt = await resolvePrompt({ mode });
      const resolvedPrompt = resolveModelPlaceholders(prompt, modelConfig);
      const result = await adapter.run(resolvedPrompt, modelConfig.smart);

      if (result.exitCode !== 0) {
        console.error(result.stderr || "Failed to run iteration");
        process.exit(1);
      }

      const sessionId = result.sessionId || `unknown-${iteration}`;
      console.log(`\n--- Iteration ${iteration}/${maxIterations} (Session: ${sessionId}) ---`);
      console.log(result.stdout);

      const sessionState: SessionState = {
        iteration,
        sessionId,
        startedAt: new Date().toISOString(),
        mode,
        prompt,
        agent: agentType,
        projectMode: agentType === AgentType.ClaudeCode && mode === Mode.Build ? true : undefined,
      };
      sessionsFile.sessions.push(sessionState);
      await writeSessionsFile(sessionsFile);

      if (result.completionDetected) {
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
