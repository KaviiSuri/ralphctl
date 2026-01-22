import { createAgent, AgentUnavailableError } from "../agents/factory.js";
import { AgentType, type AgentAdapter } from "../../domain/agent.js";
import { readSessionsFile } from "../state/index.js";
import { writeFile } from "../files/index.js";
import type { InspectEntry } from "../../domain/types.js";
import type { SessionState } from "../../domain/types.js";

const DEFAULT_OUTPUT_FILE = "inspect.json";

export async function inspectHandler(options?: { output?: string }): Promise<void> {
  const outputFile = options?.output ?? DEFAULT_OUTPUT_FILE;

  const sessions = await readSessionsFile();

  if (sessions.length === 0) {
    console.log("No sessions found in .ralphctl/ralph-sessions.json");
    await writeFile(outputFile, JSON.stringify([], null, 2));
    return;
  }

  const entries: InspectEntry[] = [];
  const cwd = process.cwd();

  const sessionsByAgent = new Map<AgentType, SessionState[]>();
  for (const session of sessions) {
    if (!sessionsByAgent.has(session.agent)) {
      sessionsByAgent.set(session.agent, []);
    }
    sessionsByAgent.get(session.agent)!.push(session);
  }

  const adapters = new Map<AgentType, AgentAdapter>();
  for (const [agentType] of sessionsByAgent.entries()) {
    try {
      const adapter = await createAgent(agentType);
      adapters.set(agentType, adapter);
    } catch (error) {
      if (!(error instanceof AgentUnavailableError)) {
        throw error;
      }
      console.warn(`Skipping sessions for ${agentType} (agent not available)`);
    }
  }

  for (const session of sessions) {
    const adapter = adapters.get(session.agent);

    if (!adapter) {
      entries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: session.agent,
        printMode: session.printMode,
        export: null,
        error: `Agent ${session.agent} not available`,
      });
      continue;
    }

    try {
      const result = await adapter.export(session.sessionId);

      entries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: session.agent,
        printMode: session.printMode,
        export: result.success ? result.exportData : null,
        error: result.success ? undefined : result.error,
      });
    } catch (error) {
      entries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: session.agent,
        printMode: session.printMode,
        export: null,
        error: String(error),
      });
    }
  }

  let writeSuccess = false;
  try {
    await writeFile(outputFile, JSON.stringify(entries, null, 2));
    writeSuccess = true;
    console.log(`Exported ${entries.length} session(s) to ${outputFile}`);
  } catch (error) {
    console.error(`Failed to write inspect file: ${error}`);
  }

  const successfulExports = entries.filter(e => e.export !== null && !e.error).length;
  const failedExports = entries.length - successfulExports;

  if (!writeSuccess || failedExports > 0) {
    console.warn(`\nExport summary: ${successfulExports}/${entries.length} sessions succeeded, ${failedExports} failed`);
  }
}
