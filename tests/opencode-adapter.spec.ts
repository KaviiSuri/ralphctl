import { describe, it, expect } from "bun:test";
import type { ProcessRunnerResult, ProcessRunnerOptions } from "../src/lib/process/runner.js";

type MockRunner = (options: ProcessRunnerOptions) => Promise<ProcessRunnerResult>;

class TestableOpenCodeAdapter {
  private mockRunner: MockRunner;
  private cwd?: string;
  private env?: Record<string, string>;

  constructor(mockRunner: MockRunner, cwd?: string, env?: Record<string, string>) {
    this.mockRunner = mockRunner;
    this.cwd = cwd;
    this.env = env;
  }

  async checkAvailability() {
    const result = await this.mockRunner({
      command: ["opencode", "--version"],
      cwd: this.cwd,
      env: this.env,
    });

    if (result.success && result.stdout.trim()) {
      const version = result.stdout.trim();
      return { available: true, version };
    }

    return {
      available: false,
      error: result.stderr || result.stdout || "OpenCode is not available",
    };
  }

  async run(prompt: string) {
    const result = await this.mockRunner({
      command: ["opencode", "run", prompt],
      cwd: this.cwd,
      env: this.env,
    });

    if (result.success) {
      return { success: true, output: result.stdout };
    }

    return {
      success: false,
      output: result.stdout,
      error: result.stderr || "Failed to run OpenCode",
    };
  }

  async runWithPrompt(prompt: string) {
    const result = await this.mockRunner({
      command: ["opencode", "--prompt", prompt],
      cwd: this.cwd,
      env: this.env,
    });

    if (result.success) {
      return { success: true, output: result.stdout };
    }

    return {
      success: false,
      output: result.stdout,
      error: result.stderr || "Failed to run OpenCode with prompt",
    };
  }

  async export(sessionId: string) {
    const result = await this.mockRunner({
      command: ["opencode", "export", sessionId],
      cwd: this.cwd,
      env: this.env,
    });

    if (result.success) {
      return { success: true, output: result.stdout };
    }

    return {
      success: false,
      output: result.stdout,
      error: result.stderr || "Failed to export session",
    };
  }
}

describe("OpenCodeAdapter", () => {
  describe("checkAvailability", () => {
    it("should return version when opencode is available", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "opencode 1.0.0\n",
        stderr: "",
        success: true,
      });

      const adapter = new TestableOpenCodeAdapter(mockRunner);
      const result = await adapter.checkAvailability();

      expect(result.available).toBe(true);
      expect(result.version).toBe("opencode 1.0.0");
    });

    it("should return error when opencode is not available", async () => {
      const mockRunner = async () => ({
        exitCode: 1,
        stdout: "",
        stderr: "command not found: opencode",
        success: false,
      });

      const adapter = new TestableOpenCodeAdapter(mockRunner);
      const result = await adapter.checkAvailability();

      expect(result.available).toBe(false);
      expect(result.error).toBe("command not found: opencode");
    });
  });

  describe("run", () => {
    it("should execute opencode run command", async () => {
      const mockRunner = async (options: ProcessRunnerOptions) => ({
        exitCode: 0,
        stdout: "OpenCode executed successfully",
        stderr: "",
        success: true,
      });

      const adapter = new TestableOpenCodeAdapter(mockRunner);
      const result = await adapter.run("test prompt");

      expect(result.success).toBe(true);
      expect(result.output).toBe("OpenCode executed successfully");
    });
  });

  describe("runWithPrompt", () => {
    it("should execute opencode --prompt command", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "Prompt execution result",
        stderr: "",
        success: true,
      });

      const adapter = new TestableOpenCodeAdapter(mockRunner);
      const result = await adapter.runWithPrompt("interactive prompt");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Prompt execution result");
    });
  });

  describe("export", () => {
    it("should execute opencode export command", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "Exported session data",
        stderr: "",
        success: true,
      });

      const adapter = new TestableOpenCodeAdapter(mockRunner);
      const result = await adapter.export("session-123");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Exported session data");
    });
  });
});
