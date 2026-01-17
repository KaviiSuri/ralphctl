import { describe, it, expect, mock, beforeEach } from "bun:test";
import { runHandler } from "../src/lib/commands/run.js";
import { stepHandler } from "../src/lib/commands/step.js";
import { inspectHandler } from "../src/lib/commands/inspect.js";
import { Mode } from "../src/domain/types.js";

describe("Command Handlers", () => {
  describe("runHandler", () => {
    beforeEach(() => {
      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: true,
                version: "1.0.0",
              })
            );
          },
        };
      });
    });

    it("should check opencode availability and fail if unavailable", async () => {
      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      global.process.exit = mockExit;

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: false,
                error: "OpenCode not found",
              })
            );
          },
        };
      });

      const mockConsoleError = mock();
      global.console.error = mockConsoleError;

      await expect(runHandler({ mode: Mode.Plan })).rejects.toThrow(
        "process.exit(1)"
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        "OpenCode not found"
      );

      mockExit.mockRestore();
    });

    it("should not fail when opencode is available", async () => {
      const mockExit = mock(() => {
        throw new Error("process.exit");
      });

      global.process.exit = mockExit;

      await runHandler({ mode: Mode.Build });

      expect(mockExit).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });
  });

  describe("stepHandler", () => {
    beforeEach(() => {
      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: true,
                version: "1.0.0",
              })
            );

            runWithPrompt = mock(() =>
              Promise.resolve({
                success: true,
                output: "Step executed",
              })
            );
          },
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(() => Promise.resolve("Mocked prompt")),
        };
      });
    });

    it("should check opencode availability and use runWithPrompt", async () => {
      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan });

      expect(mockLog).toHaveBeenCalledWith("Running plan mode step");
      expect(mockLog).toHaveBeenCalledWith("Step executed");
    });

    it("should fail if opencode is unavailable", async () => {
      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      global.process.exit = mockExit;

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: false,
                error: "OpenCode not found",
              })
            );
          },
        };
      });

      const mockConsoleError = mock();
      global.console.error = mockConsoleError;

      await expect(stepHandler({ mode: Mode.Build })).rejects.toThrow(
        "process.exit(1)"
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        "OpenCode not found"
      );

      mockExit.mockRestore();
    });
  });

  describe("inspectHandler", () => {
    beforeEach(() => {
      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            export = mock(() =>
              Promise.resolve({
                success: true,
                output: "Exported data",
              })
            );
          },
        };
      });
    });

    it("should use the export() method from adapter", async () => {
      const mockLog = mock();
      global.console.log = mockLog;

      await inspectHandler();

      expect(mockLog).toHaveBeenCalledWith("Exported data");
    });

    it("should fail if export fails", async () => {
      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      global.process.exit = mockExit;

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            export = mock(() =>
              Promise.resolve({
                success: false,
                output: "",
                error: "Export failed",
              })
            );
          },
        };
      });

      const mockConsoleError = mock();
      global.console.error = mockConsoleError;

      await expect(inspectHandler()).rejects.toThrow("process.exit(1)");

      expect(mockConsoleError).toHaveBeenCalledWith("Export failed");

      mockExit.mockRestore();
    });
  });
});
