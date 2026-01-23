import { describe, it, expect } from "bun:test";
import {
  detectAvailableTools,
  isCommandAvailable,
  type CommandExecutor,
} from "../src/lib/tools/detection.js";

describe("Tool Detection", () => {
  describe("isCommandAvailable", () => {
    it("should return true when command exists", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        // Simulate successful execution
        return;
      };

      const result = isCommandAvailable("claude", mockExecutor);
      expect(result).toBe(true);
    });

    it("should return false when command throws error", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        throw new Error("Command not found");
      };

      const result = isCommandAvailable("claude", mockExecutor);
      expect(result).toBe(false);
    });

    it("should handle timeout errors gracefully", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        const error: any = new Error("Command timed out");
        error.code = "ETIMEDOUT";
        throw error;
      };

      const result = isCommandAvailable("claude", mockExecutor);
      expect(result).toBe(false);
    });

    it("should handle permission errors gracefully", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        const error: any = new Error("Permission denied");
        error.code = "EACCES";
        throw error;
      };

      const result = isCommandAvailable("claude", mockExecutor);
      expect(result).toBe(false);
    });

    it("should use 'which' command on Unix-like systems", () => {
      const originalPlatform = process.platform;
      let capturedCommand = "";

      // Mock platform as darwin (macOS)
      Object.defineProperty(process, "platform", {
        value: "darwin",
        writable: true,
        configurable: true,
      });

      const mockExecutor: CommandExecutor = (command: string) => {
        capturedCommand = command;
      };

      isCommandAvailable("claude", mockExecutor);

      expect(capturedCommand).toBe("which claude");

      // Restore platform
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
        configurable: true,
      });
    });

    it("should use 'where' command on Windows", () => {
      const originalPlatform = process.platform;
      let capturedCommand = "";

      // Mock platform as win32 (Windows)
      Object.defineProperty(process, "platform", {
        value: "win32",
        writable: true,
        configurable: true,
      });

      const mockExecutor: CommandExecutor = (command: string) => {
        capturedCommand = command;
      };

      isCommandAvailable("opencode", mockExecutor);

      expect(capturedCommand).toBe("where opencode");

      // Restore platform
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("detectAvailableTools", () => {
    it("should detect both tools when both are available", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        // All commands succeed
        return;
      };

      const result = detectAvailableTools(mockExecutor);

      expect(result.claude).toBe(true);
      expect(result.opencode).toBe(true);
      expect(result.hasAny).toBe(true);
      expect(result.hasBoth).toBe(true);
    });

    it("should detect only Claude Code when only claude is available", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        if (command.includes("claude")) {
          return;
        }
        throw new Error("Command not found");
      };

      const result = detectAvailableTools(mockExecutor);

      expect(result.claude).toBe(true);
      expect(result.opencode).toBe(false);
      expect(result.hasAny).toBe(true);
      expect(result.hasBoth).toBe(false);
    });

    it("should detect only OpenCode when only opencode is available", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        if (command.includes("opencode")) {
          return;
        }
        throw new Error("Command not found");
      };

      const result = detectAvailableTools(mockExecutor);

      expect(result.claude).toBe(false);
      expect(result.opencode).toBe(true);
      expect(result.hasAny).toBe(true);
      expect(result.hasBoth).toBe(false);
    });

    it("should detect no tools when neither is available", () => {
      const mockExecutor: CommandExecutor = (command: string) => {
        throw new Error("Command not found");
      };

      const result = detectAvailableTools(mockExecutor);

      expect(result.claude).toBe(false);
      expect(result.opencode).toBe(false);
      expect(result.hasAny).toBe(false);
      expect(result.hasBoth).toBe(false);
    });

    it("should check both claude and opencode commands", () => {
      const checkedCommands: string[] = [];

      const mockExecutor: CommandExecutor = (command: string) => {
        checkedCommands.push(command);
        throw new Error("Command not found");
      };

      detectAvailableTools(mockExecutor);

      expect(checkedCommands.length).toBe(2);
      expect(checkedCommands.some((cmd) => cmd.includes("claude"))).toBe(true);
      expect(checkedCommands.some((cmd) => cmd.includes("opencode"))).toBe(true);
    });
  });
});

