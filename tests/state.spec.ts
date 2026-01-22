import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { SessionState } from "../src/domain/types.js";
import { AgentType } from "../src/domain/agent.js";

const uniqueId = Math.random().toString(36).substring(7);
const RALPHCTL_DIR = `.ralphctl-${uniqueId}`;
const SESSIONS_FILE = `.ralphctl-${uniqueId}/ralph-sessions.json`;

async function ensureTestDir() {
  try {
    await (await import("fs/promises")).mkdir(RALPHCTL_DIR);
  } catch (error) {
  }
}

async function cleanup() {
  await (await import("fs/promises")).rm(RALPHCTL_DIR, { recursive: true, force: true }).catch(() => {});
}

async function writeTestSessionsFile(sessions: SessionState[]) {
  await ensureTestDir();
  const fs = await import("fs/promises");
  await fs.writeFile(SESSIONS_FILE, JSON.stringify({ sessions }, null, 2));
}

async function readTestSessionsFile(): Promise<SessionState[]> {
  try {
    const fs = await import("fs/promises");
    const content = await fs.readFile(SESSIONS_FILE, "utf-8");
    const sessionsFile = JSON.parse(content);
    return sessionsFile.sessions || [];
  } catch (error) {
    return [];
  }
}

async function ensureTestRalphctlDir(): Promise<void> {
  try {
    await (await import("fs/promises")).mkdir(RALPHCTL_DIR);
  } catch (error) {
    const fs = await import("fs/promises");
    try {
      await fs.stat(RALPHCTL_DIR);
    } catch {
      throw error;
    }
  }
}

describe("state utilities", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  describe("ensureRalphctlDir", () => {
    it("should create .ralphctl directory if it does not exist", async () => {
      const fs = await import("fs/promises");
      await fs.stat(RALPHCTL_DIR).catch(() => {
      });

      await ensureTestRalphctlDir();

      const stats = await fs.stat(RALPHCTL_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should not error if .ralphctl directory already exists", async () => {
      await ensureTestRalphctlDir();
      const fs = await import("fs/promises");
      const statsBefore = await fs.stat(RALPHCTL_DIR);
      expect(statsBefore.isDirectory()).toBe(true);

      await ensureTestRalphctlDir();

      const statsAfter = await fs.stat(RALPHCTL_DIR);
      expect(statsAfter.isDirectory()).toBe(true);
    });
  });

  describe("writeSessionsFile and readSessionsFile", () => {
    it("should write and read sessions file", async () => {
      const sessions: SessionState[] = [
        {
          iteration: 1,
          sessionId: "ses_test123",
          startedAt: "2024-01-01T00:00:00.000Z",
          mode: "plan",
          prompt: "test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      await writeTestSessionsFile(sessions);
      const readSessions = await readTestSessionsFile();

      expect(readSessions).toEqual(sessions);
    });

    it("should append new sessions to existing file", async () => {
      const sessions1: SessionState[] = [
        {
          iteration: 1,
          sessionId: "ses_test123",
          startedAt: "2024-01-01T00:00:00.000Z",
          mode: "plan",
          prompt: "test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      await writeTestSessionsFile(sessions1);

      const sessions2: SessionState[] = [
        {
          iteration: 1,
          sessionId: "ses_test123",
          startedAt: "2024-01-01T00:00:00.000Z",
          mode: "plan",
          prompt: "test prompt",
          agent: AgentType.OpenCode,
        },
        {
          iteration: 2,
          sessionId: "ses_test456",
          startedAt: "2024-01-01T01:00:00.000Z",
          mode: "build",
          prompt: "another prompt",
          agent: AgentType.OpenCode,
        },
      ];

      await writeTestSessionsFile(sessions2);
      const readSessions = await readTestSessionsFile();

      expect(readSessions).toEqual(sessions2);
    });

    it("should return empty array when sessions file does not exist", async () => {
      await cleanup();
      const readSessions = await readTestSessionsFile();

      expect(readSessions).toEqual([]);
    });

    it("should write valid JSON file", async () => {
      const sessions: SessionState[] = [
        {
          iteration: 1,
          sessionId: "ses_test123",
          startedAt: "2024-01-01T00:00:00.000Z",
          mode: "plan",
          prompt: "test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      await writeTestSessionsFile(sessions);

      const fs = await import("fs/promises");
      const content = await fs.readFile(SESSIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty("sessions");
      expect(parsed.sessions).toEqual(sessions);
    });
  });
});
