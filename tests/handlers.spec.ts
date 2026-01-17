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

            run = mock(() =>
              Promise.resolve({
                success: true,
                output: "Iteration output <promise>COMPLETE</promise>",
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

            run = mock(() =>
              Promise.resolve({
                success: true,
                output: "",
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

    it("should stop at max iterations without completion", async () => {
      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: true,
                version: "1.0.0",
              })
            );

            run = mock(() =>
              Promise.resolve({
                success: true,
                output: "Iteration output without completion",
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

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, maxIterations: 3 });

      expect(mockLog).toHaveBeenCalledWith("\n⚠ Stopped at maximum iterations (3) without completion");
    });

    it("should run multiple iterations until completion", async () => {
      let callCount = 0;
      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: true,
                version: "1.0.0",
              })
            );

            run = mock(() => {
              callCount++;
              if (callCount < 2) {
                return Promise.resolve({
                  success: true,
                  output: "Still working...",
                });
              }
              return Promise.resolve({
                success: true,
                output: "Done! <promise>COMPLETE</promise>",
              });
            });
          },
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(() => Promise.resolve("Mocked prompt")),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, maxIterations: 5 });

      expect(mockLog).toHaveBeenCalledWith("\n✓ Completed in 2 iteration(s)");
      expect(callCount).toBe(2);
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
