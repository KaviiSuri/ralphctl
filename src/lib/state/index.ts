import { writeFile } from "../files/index.js";
import type { SessionState, SessionsFile } from "../../domain/types.js";
import { AgentType } from "../../domain/agent.js";

const RALPHCTL_DIR = ".ralphctl";
const SESSIONS_FILE = ".ralphctl/ralph-sessions.json";

export async function ensureRalphctlDir(): Promise<void> {
  try {
    await import("fs/promises").then(fs => fs.mkdir(RALPHCTL_DIR));
  } catch (error) {
    const fs = await import("fs/promises");
    try {
      await fs.stat(RALPHCTL_DIR);
    } catch {
      throw error;
    }
  }
}

export async function writeSessionsFile(sessions: SessionState[]): Promise<void> {
  await ensureRalphctlDir();
  const sessionsFile: SessionsFile = { sessions, version: "1" };
  await writeFile(SESSIONS_FILE, JSON.stringify(sessionsFile, null, 2));
}

export async function readSessionsFile(): Promise<SessionState[]> {
  try {
    const content = await Bun.file(SESSIONS_FILE).text();
    const sessionsFile: SessionsFile = JSON.parse(content);

    const migratedSessions = sessionsFile.sessions.map((session: any): SessionState => ({
      ...session,
      agent: session.agent || AgentType.OpenCode,
      printMode: session.printMode,
      project: session.project,
    }));

    return migratedSessions;
  } catch (error) {
    return [];
  }
}
