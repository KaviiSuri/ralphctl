import { writeFile } from "../files/index.js";
import { AgentType } from "../../domain/agent.js";
import type { SessionState, SessionsFile } from "../../domain/types.js";

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

export async function writeSessionsFile(sessionsFile: SessionsFile): Promise<void> {
  await ensureRalphctlDir();

  if (!sessionsFile.version) {
    sessionsFile.version = "1.0.0";
  }

  await writeFile(SESSIONS_FILE, JSON.stringify(sessionsFile, null, 2));
}

export async function readSessionsFile(): Promise<SessionsFile> {
  try {
    const content = await Bun.file(SESSIONS_FILE).text();
    const parsed = JSON.parse(content);

    const sessions = (parsed.sessions || []).map((session: any) => ({
      ...session,
      agent: session.agent || AgentType.OpenCode,
      projectMode: session.projectMode,
    }));

    return {
      sessions,
      version: parsed.version || "1.0.0",
    };
  } catch (error) {
    return { sessions: [], version: "1.0.0" };
  }
}
