import { OpenCodeAdapter } from "../opencode/adapter.js";
import { readSessionsFile } from "../state/index.js";
import { writeFile } from "../files/index.js";
import type { InspectEntry } from "../../domain/types.js";
import type { SessionState } from "../../domain/types.js";

const DEFAULT_OUTPUT_FILE = "inspect.json";

export async function inspectHandler(options?: { output?: string }): Promise<void> {
  const adapter = new OpenCodeAdapter();
  
  const outputFile = options?.output ?? DEFAULT_OUTPUT_FILE;
  
  const sessions = await readSessionsFile();
  
  if (sessions.length === 0) {
    console.log("No sessions found in .ralphctl/ralph-sessions.json");
    await writeFile(outputFile, JSON.stringify([], null, 2));
    return;
  }
  
  const entries: InspectEntry[] = [];
  
  for (const session of sessions) {
    console.log(`Exporting session ${session.sessionId} (iteration ${session.iteration}/${sessions.length})`);
    
    const result = await adapter.export(session.sessionId);
    
    if (!result.success) {
      console.error(`Warning: Failed to export session ${session.sessionId} (iteration ${session.iteration}): ${result.error}`);
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
    
    const entry: InspectEntry = {
      sessionId: session.sessionId,
      iteration: session.iteration,
      startedAt: session.startedAt,
      export: String(result.exportData),
    };
    
    entries.push(entry);
  }
  
  try {
    await writeFile(outputFile, JSON.stringify(entries, null, 2));
    console.log(`Exported ${entries.length} session(s) to ${outputFile}`);
  } catch (error) {
    console.error(`Failed to write inspect file: ${error}`);
    process.exit(1);
  }
}
