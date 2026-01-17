import { describe, it, expect, mock, beforeEach } from "bun:test";
import { runHandler } from "../src/lib/commands/run.js";
import { stepHandler } from "../src/lib/commands/step.js";
import { inspectHandler } from "../src/lib/commands/inspect.js";
import { initHandler } from "../src/lib/commands/init.js";
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

      expect(mockLog).toHaveBeenCalledWith("Running plan mode");
      expect(mockLog).toHaveBeenCalledWith("Permissions: allow-all");
      expect(mockLog).toHaveBeenCalledWith("\n✓ Completed in 2 iteration(s)");
      expect(callCount).toBe(2);
    });

    it("should use custom permission posture", async () => {
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
                output: "Output <promise>COMPLETE</promise>",
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

      await runHandler({ mode: Mode.Plan, permissionPosture: "ask" });

      expect(mockLog).toHaveBeenCalledWith("Permissions: ask");
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

            runWithPromptInteractive = mock(() =>
              Promise.resolve({
                success: true,
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

    it("should check opencode availability and use runWithPromptInteractive", async () => {
      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan });

      expect(mockLog).toHaveBeenCalledWith("Running plan mode step");
      expect(mockLog).toHaveBeenCalledWith("Permissions: allow-all");
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

  describe("initHandler", () => {
    beforeEach(() => {
      mock.module("../src/lib/files/index.js", () => {
        return {
          fileExists: mock(() => Promise.resolve(false)),
          writeFile: mock(() => Promise.resolve()),
        };
      });

      mock.module("../src/lib/io/index.js", () => {
        return {
          confirmOverwrite: mock(() => Promise.resolve(false)),
        };
      });

      mock.module("../src/lib/templates/index.js", () => {
        return {
          PLAN_TEMPLATE: "Mock PLAN template",
          BUILD_TEMPLATE: "Mock BUILD template",
        };
      });
    });

    it("should write both files when they don't exist", async () => {
      const { fileExists, writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      global.console.log = mockLog;

      await initHandler({ force: false });

      expect(fileExists).toHaveBeenCalledWith("PROMPT_plan.md");
      expect(fileExists).toHaveBeenCalledWith("PROMPT_build.md");
      expect(writeFile).toHaveBeenCalledWith("PROMPT_plan.md", "Mock PLAN template");
      expect(writeFile).toHaveBeenCalledWith("PROMPT_build.md", "Mock BUILD template");
      expect(mockLog).toHaveBeenCalledWith("Created PROMPT_plan.md");
      expect(mockLog).toHaveBeenCalledWith("Created PROMPT_build.md");
      expect(mockLog).toHaveBeenCalledWith("\n✓ Initialized prompt templates");
    });

    it("should prompt for confirmation when files exist and force is false", async () => {
      mock.module("../src/lib/files/index.js", () => {
        return {
          fileExists: mock(() => Promise.resolve(true)),
          writeFile: mock(() => Promise.resolve()),
        };
      });

      mock.module("../src/lib/io/index.js", () => {
        return {
          confirmOverwrite: mock(() => Promise.resolve(false)),
        };
      });

      mock.module("../src/lib/templates/index.js", () => {
        return {
          PLAN_TEMPLATE: "Mock PLAN template",
          BUILD_TEMPLATE: "Mock BUILD template",
        };
      });

      const { fileExists, writeFile } = await import("../src/lib/files/index.js");
      const { confirmOverwrite } = await import("../src/lib/io/index.js");
      const mockLog = mock();
      global.console.log = mockLog;

      await initHandler({ force: false });

      expect(confirmOverwrite).toHaveBeenCalledWith("PROMPT_plan.md");
      expect(confirmOverwrite).toHaveBeenCalledWith("PROMPT_build.md");
      expect(mockLog).toHaveBeenCalledWith("Skipping PROMPT_plan.md");
      expect(mockLog).toHaveBeenCalledWith("Skipping PROMPT_build.md");
      expect(mockLog).toHaveBeenCalledWith("\nNo files were written");
    });

    it("should overwrite when user confirms", async () => {
      mock.module("../src/lib/files/index.js", () => {
        return {
          fileExists: mock(() => Promise.resolve(true)),
          writeFile: mock(() => Promise.resolve()),
        };
      });

      mock.module("../src/lib/io/index.js", () => {
        return {
          confirmOverwrite: mock(() => Promise.resolve(true)),
        };
      });

      mock.module("../src/lib/templates/index.js", () => {
        return {
          PLAN_TEMPLATE: "Mock PLAN template",
          BUILD_TEMPLATE: "Mock BUILD template",
        };
      });

      const { fileExists, writeFile } = await import("../src/lib/files/index.js");
      const { confirmOverwrite } = await import("../src/lib/io/index.js");
      const mockLog = mock();
      global.console.log = mockLog;

      await initHandler({ force: false });

      expect(writeFile).toHaveBeenCalledWith("PROMPT_plan.md", "Mock PLAN template");
      expect(writeFile).toHaveBeenCalledWith("PROMPT_build.md", "Mock BUILD template");
      expect(mockLog).toHaveBeenCalledWith("Created PROMPT_plan.md");
      expect(mockLog).toHaveBeenCalledWith("Created PROMPT_build.md");
      expect(mockLog).toHaveBeenCalledWith("\n✓ Initialized prompt templates");
    });

    it("should skip confirmation when force is true", async () => {
      mock.module("../src/lib/files/index.js", () => {
        return {
          fileExists: mock(() => Promise.resolve(true)),
          writeFile: mock(() => Promise.resolve()),
        };
      });

      mock.module("../src/lib/io/index.js", () => {
        return {
          confirmOverwrite: mock(() => Promise.resolve(false)),
        };
      });

      mock.module("../src/lib/templates/index.js", () => {
        return {
          PLAN_TEMPLATE: "Mock PLAN template",
          BUILD_TEMPLATE: "Mock BUILD template",
        };
      });

      const { fileExists, writeFile } = await import("../src/lib/files/index.js");
      const { confirmOverwrite } = await import("../src/lib/io/index.js");
      const mockLog = mock();
      global.console.log = mockLog;

      await initHandler({ force: true });

      expect(confirmOverwrite).not.toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith("PROMPT_plan.md", "Mock PLAN template");
      expect(writeFile).toHaveBeenCalledWith("PROMPT_build.md", "Mock BUILD template");
      expect(mockLog).toHaveBeenCalledWith("Created PROMPT_plan.md");
      expect(mockLog).toHaveBeenCalledWith("Created PROMPT_build.md");
      expect(mockLog).toHaveBeenCalledWith("\n✓ Initialized prompt templates");
    });
  });
});
