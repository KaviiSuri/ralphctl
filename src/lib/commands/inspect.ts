import { AgentType } from "../../domain/agent.js";
import type { AgentAdapter } from "../../domain/agent.js";
import { readSessionsFile } from "../state/index.js";
import { writeFile } from "../files/index.js";
import { createAgent } from "../agents/factory.js";
import type { InspectEntry } from "../../domain/types.js";

const DEFAULT_OUTPUT_FILE = "inspect.json";

async function writeInspectFile(outputFile: string, entries: InspectEntry[]): Promise<void> {
  await writeFile(outputFile, JSON.stringify({
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    entries,
  }, null, 2));
}

export async function inspectHandler(options?: { output?: string }): Promise<void> {
  const outputFile = options?.output ?? DEFAULT_OUTPUT_FILE;

  const sessionsFile = await readSessionsFile();

  if (sessionsFile.sessions.length === 0) {
    console.log("No sessions found in .ralphctl/ralph-sessions.json");
    await writeInspectFile(outputFile, []);
    return;
  }

  const entries: InspectEntry[] = [];

  const sessionsByAgent = new Map<AgentType, typeof sessionsFile.sessions>();
  for (const session of sessionsFile.sessions) {
    const agent = session.agent || AgentType.OpenCode;
    if (!sessionsByAgent.has(agent)) {
      sessionsByAgent.set(agent, []);
    }
    sessionsByAgent.get(agent)!.push(session);
  }

  const adapters = new Map<AgentType, AgentAdapter>();
  for (const [agentType, sessions] of sessionsByAgent.entries()) {
    try {
      const adapter = await createAgent(agentType, { cwd: process.cwd() });
      adapters.set(agentType, adapter);
    } catch (error) {
      console.warn(`Warning: Cannot export sessions for ${agentType} (agent not available)`);
      for (const session of sessions) {
        entries.push({
          sessionId: session.sessionId,
          iteration: session.iteration,
          startedAt: session.startedAt,
          agent: agentType,
          projectMode: session.projectMode,
          export: null,
          error: `Agent ${agentType} not available`,
        });
      }
    }
  }

  for (const session of sessionsFile.sessions) {
    const agentType = session.agent || AgentType.OpenCode;
    const adapter = adapters.get(agentType);

    if (!adapter) {
      console.warn(`Skipping session ${session.sessionId}: agent ${agentType} not available`);
      continue;
    }

    if (!session.sessionId || session.sessionId.trim() === "") {
      console.error(`Error: Missing sessionId for iteration ${session.iteration}`);
      process.exit(1);
    }

    if (!session.startedAt || session.startedAt.trim() === "") {
      console.error(`Error: Missing startedAt for session ${session.sessionId}`);
      process.exit(1);
    }

    if (typeof session.iteration !== "number" || session.iteration <= 0) {
      console.error(`Error: Invalid iteration number ${session.iteration} for session ${session.sessionId}`);
      process.exit(1);
    }

    console.log(`Exporting session ${session.sessionId} (iteration ${session.iteration}/${sessionsFile.sessions.length}, agent: ${agentType})`);

    try {
      const exportResult = await adapter.export(session.sessionId);

      if (!exportResult.success) {
        console.error(`Warning: Failed to export session ${session.sessionId}: ${exportResult.error}`);
        entries.push({
          sessionId: session.sessionId,
          iteration: session.iteration,
          startedAt: session.startedAt,
          agent: agentType,
          projectMode: session.projectMode,
          export: null,
          error: exportResult.error,
        });
        continue;
      }

      entries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: agentType,
        projectMode: session.projectMode,
        export: exportResult.exportData,
      });
    } catch (error) {
      console.error(`Warning: Error exporting session ${session.sessionId}: ${String(error)}`);
      entries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: agentType,
        projectMode: session.projectMode,
        export: null,
        error: String(error),
      });
    }
  }

  try {
    await writeInspectFile(outputFile, entries);
    console.log(`Exported ${entries.length} session(s) to ${outputFile}`);
  } catch (error) {
    console.error(`Failed to write inspect file: ${error}`);
    process.exit(1);
  }
}
