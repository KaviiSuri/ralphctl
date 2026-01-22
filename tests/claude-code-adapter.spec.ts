import { describe, it, expect, mock } from "bun:test";
import type { ProcessRunnerResult, ProcessRunnerOptions } from "../src/lib/process/runner.js";

type MockRunner = (options: ProcessRunnerOptions) => Promise<ProcessRunnerResult>;

class TestableClaudeCodeAdapter {
  private mockRunner: MockRunner;
  private cwd: string;
  private cachedVersion?: string;

  constructor(mockRunner: MockRunner, cwd: string = process.cwd()) {
    this.mockRunner = mockRunner;
    this.cwd = cwd;
  }

  private extractSessionId(output: string): string | null {
    const patterns = [
      /Session ID:\s*([a-f0-9-]+)/i,
      /"sessionId":\s*"([a-f0-9-]+)"/,
      /\[Session:\s*([a-f0-9-]+)\]/i,
      /session:\s*([a-f0-9-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  private detectCompletion(output: string): boolean {
    return output.includes("<promise>COMPLETE</promise>");
  }

  async checkAvailability(): Promise<boolean> {
    const result = await this.mockRunner({
      command: ["claude", "--version"],
      cwd: this.cwd,
      env: {},
    });

    if (result.success && result.stdout.trim()) {
      const match = result.stdout.match(/Claude Code\s+v?([\d.]+)/i);
      if (match?.[1]) {
        this.cachedVersion = match[1];
        return true;
      }
      this.cachedVersion = result.stdout.trim();
      return true;
    }

    return false;
  }

  async run(
    prompt: string,
    model: string,
    headless: boolean = true
  ): Promise<{ stdout: string; stderr: string; sessionId: string | null; completionDetected: boolean; exitCode: number }> {
    const args = this.buildCommandArgs(prompt, model, false, headless);
    const result = await this.mockRunner({
      command: ["claude", ...args],
      cwd: this.cwd,
      env: {},
    });

    const combinedOutput = result.stdout + result.stderr;

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      sessionId: null,
      completionDetected: this.detectCompletion(combinedOutput),
      exitCode: result.exitCode ?? -1,
    };
  }

  async runInteractive(
    prompt: string,
    model: string,
    headless: boolean = true
  ): Promise<{ command: string[] }> {
    const args = this.buildCommandArgs(prompt, model, true, headless);
    return {
      command: args,
    };
  }

  async export(sessionId: string): Promise<{ success: boolean; exportData: unknown; error?: string }> {
    return {
      success: false,
      exportData: null,
      error: "Export requires real Claude Code installation",
    };
  }

  getMetadata() {
    return {
      name: "claude-code",
      displayName: "Claude Code",
      version: this.cachedVersion,
      cliCommand: "claude",
    };
  }

  private buildCommandArgs(
    prompt: string,
    model: string,
    interactive: boolean = false,
    headless: boolean = true
  ): string[] {
    const args: string[] = [];

    if (!interactive && headless) {
      args.push("-p");
    }

    if (model) {
      args.push("--model", model);
    }

    if (interactive) {
      args.push(prompt);
    } else {
      args.push("--prompt", prompt);
    }

    return args;
  }
}

describe("ClaudeCodeAdapter", () => {
  describe("checkAvailability", () => {
    it("should return true when claude is available with version", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "Claude Code v1.2.3\n",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.checkAvailability();

      expect(result).toBe(true);
      expect(adapter.getMetadata().version).toBe("1.2.3");
    });

    it("should return true when claude is available without version prefix", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "Claude Code 2.0.0\n",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.checkAvailability();

      expect(result).toBe(true);
    });

    it("should return false when claude is not available", async () => {
      const mockRunner = async () => ({
        exitCode: 1,
        stdout: "",
        stderr: "command not found: claude",
        success: false,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.checkAvailability();

      expect(result).toBe(false);
    });

    it("should return false when command fails", async () => {
      const mockRunner = async () => ({
        exitCode: 127,
        stdout: "",
        stderr: "claude: command not found",
        success: false,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.checkAvailability();

      expect(result).toBe(false);
    });
  });

  describe("run", () => {
    it("should execute claude with -p flag for headless mode", async () => {
      const mockRunner = async (options: ProcessRunnerOptions) => {
        expect(options.command).toContain("-p");
        expect(options.command).toContain("--prompt");
        expect(options.command).toContain("test prompt");
        return {
          exitCode: 0,
          stdout: "Claude executed successfully",
          stderr: "",
          success: true,
        };
      };

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.run("test prompt", "claude-sonnet-4-5", true);

      expect(result.stdout).toBe("Claude executed successfully");
      expect(result.exitCode).toBe(0);
    });

    it("should not include -p flag when headless mode is disabled", async () => {
      const mockRunner = async (options: ProcessRunnerOptions) => {
        expect(options.command).not.toContain("-p");
        expect(options.command).toContain("--prompt");
        return {
          exitCode: 0,
          stdout: "Claude executed",
          stderr: "",
          success: true,
        };
      };

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      await adapter.run("test prompt", "claude-sonnet-4-5", false);
    });

    it("should include model flag", async () => {
      const mockRunner = async (options: ProcessRunnerOptions) => {
        expect(options.command).toContain("--model");
        expect(options.command).toContain("claude-sonnet-4-5");
        return {
          exitCode: 0,
          stdout: "Response",
          stderr: "",
          success: true,
        };
      };

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      await adapter.run("prompt", "claude-sonnet-4-5", true);
    });

    it("should detect completion marker in stdout", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "Working... <promise>COMPLETE</promise> Done!",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.run("test", "model");

      expect(result.completionDetected).toBe(true);
    });

    it("should detect completion marker in stderr", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "Debug info <promise>COMPLETE</promise>",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.run("test", "model");

      expect(result.completionDetected).toBe(true);
    });

    it("should return null sessionId (file-based session tracking)", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "No session info here",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.run("test", "model");

      expect(result.sessionId).toBe(null);
    });

    it("should return exit code -1 when not provided", async () => {
      const mockRunner = async () => ({
        exitCode: null,
        stdout: "Output",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.run("test", "model");

      expect(result.exitCode).toBe(-1);
    });

    it("should return exit code from process runner", async () => {
      const mockRunner = async () => ({
        exitCode: 1,
        stdout: "Error",
        stderr: "Something went wrong",
        success: false,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.run("test", "model");

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("Something went wrong");
    });
  });

  describe("getMetadata", () => {
    it("should return correct metadata with version", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "Claude Code v1.5.0",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      await adapter.checkAvailability();

      const metadata = adapter.getMetadata();

      expect(metadata.name).toBe("claude-code");
      expect(metadata.displayName).toBe("Claude Code");
      expect(metadata.cliCommand).toBe("claude");
      expect(metadata.version).toBe("1.5.0");
    });

    it("should return metadata without version if not cached", () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const metadata = adapter.getMetadata();

      expect(metadata.name).toBe("claude-code");
      expect(metadata.displayName).toBe("Claude Code");
      expect(metadata.cliCommand).toBe("claude");
      expect(metadata.version).toBeUndefined();
    });
  });

  describe("runInteractive", () => {
    it("should build args for interactive mode without -p", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.runInteractive("test prompt", "claude-sonnet-4-5", true);

      expect(result.command).not.toContain("-p");
      expect(result.command).toContain("test prompt");
      expect(result.command).not.toContain("--prompt");
    });

    it("should build args for interactive mode with headless mode disabled", async () => {
      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.runInteractive("test prompt", "claude-sonnet-4-5", false);

      expect(result.command).not.toContain("-p");
      expect(result.command).toContain("test prompt");
    });
  });

  describe("export", () => {
    it("export method exists and returns expected structure", async () => {
      const sessionId = "test-session";

      const mockRunner = async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
        success: true,
      });

      const adapter = new TestableClaudeCodeAdapter(mockRunner);
      const result = await adapter.export(sessionId);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("exportData");
      expect(typeof result.success).toBe("boolean");
    });
  });
});
