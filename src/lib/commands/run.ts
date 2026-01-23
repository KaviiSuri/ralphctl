import { Mode, type SessionState, type ModelConfig, createModelConfig } from "../../domain/types.js";
import { AgentType, type AgentAdapter } from "../../domain/agent.js";
import { createAgent, AgentUnavailableError } from "../agents/factory.js";
import { resolvePrompt } from "../prompts/resolver.js";
import { resolveModelPlaceholders } from "../models/resolver.js";
import { readSessionsFile, writeSessionsFile } from "../state/index.js";
import { resolveProjectPaths, validateProject } from "../projects/validation.js";

export interface RunHandlerOptions {
  mode: Mode;
  project?: string;
  maxIterations?: number;
  permissionPosture?: "allow-all" | "ask";
  smartModel?: string;
  fastModel?: string;
  agent?: AgentType;
  noPrint?: boolean;
}

export async function runHandler(options: RunHandlerOptions): Promise<void> {
  const { mode, project, maxIterations = 10, permissionPosture = "allow-all", smartModel, fastModel, agent, noPrint = false } = options;

  // Validate and resolve project paths
  let projectContext: { projectName?: string };
  try {
    const paths = resolveProjectPaths(project);
    projectContext = { projectName: paths.projectName };

    // Show warnings if project validation found issues
    if (project) {
      const validation = validateProject(project);
      if (validation.warnings) {
        for (const warning of validation.warnings) {
          console.warn(`⚠ ${warning}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const headless = !noPrint;
  const resolvedAgent = agent ?? AgentType.OpenCode;

  let adapter: AgentAdapter;
  try {
    adapter = await createAgent(resolvedAgent, {
      permissionPosture,
      env: { ...process.env } as Record<string, string>,
      headless,
    });
  } catch (error) {
    if (error instanceof AgentUnavailableError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const adapterDefaults = adapter.getDefaultModels();
  const modelConfig: ModelConfig = createModelConfig(
    smartModel ?? adapterDefaults.smart,
    fastModel ?? adapterDefaults.fast
  );

  console.log(`Running ${mode} mode${project ? ` (project: ${project})` : ""}`);
  console.log(`Permissions: ${permissionPosture}`);

  if (agent === AgentType.ClaudeCode) {
    console.log(`Print mode: ${headless ? "enabled" : "disabled"}`);
  }

  let iteration = 1;
  let completed = false;
  const sessions = await readSessionsFile();

  try {
    while (iteration <= maxIterations && !completed) {
      const prompt = await resolvePrompt({ mode, project });
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
        agent: resolvedAgent,
        printMode: headless,
        ...(projectContext.projectName && { project: projectContext.projectName }),
      };
      sessions.push(sessionState);
      await writeSessionsFile(sessions);

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
