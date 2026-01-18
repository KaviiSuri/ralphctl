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

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
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

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
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

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
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

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, permissionPosture: "ask" });

      expect(mockLog).toHaveBeenCalledWith("Permissions: ask");
    });

    it("should use custom smart model override", async () => {
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
          resolvePrompt: mock(() => Promise.resolve("Use {smart} for this")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt.replace("{smart}", "custom/smart-model")
          ),
        };
      });

      await runHandler({ mode: Mode.Plan, smartModel: "custom/smart-model" });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");
      expect(resolveModelPlaceholders).toHaveBeenCalledWith(
        "Use {smart} for this",
        { smart: "custom/smart-model", fast: "zai-coding-plan/glm-4.7" }
      );
    });

    it("should use custom fast model override", async () => {
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
          resolvePrompt: mock(() => Promise.resolve("Use {fast} for this")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt.replace("{fast}", "custom/fast-model")
          ),
        };
      });

      await runHandler({ mode: Mode.Plan, fastModel: "custom/fast-model" });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");
      expect(resolveModelPlaceholders).toHaveBeenCalledWith(
        "Use {fast} for this",
        { smart: "openai/gpt-5.2-codex", fast: "custom/fast-model" }
      );
    });

    it("should use both model overrides together", async () => {
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
          resolvePrompt: mock(() => Promise.resolve("Use {smart} and {fast}")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt
              .replace("{smart}", "custom/smart-model")
              .replace("{fast}", "custom/fast-model")
          ),
        };
      });

      await runHandler({
        mode: Mode.Plan,
        smartModel: "custom/smart-model",
        fastModel: "custom/fast-model",
      });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");
      expect(resolveModelPlaceholders).toHaveBeenCalledWith(
        "Use {smart} and {fast}",
        { smart: "custom/smart-model", fast: "custom/fast-model" }
      );
    });

    it("should use default models when no overrides provided", async () => {
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
          resolvePrompt: mock(() => Promise.resolve("Use {smart} and {fast}")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt
              .replace("{smart}", "openai/gpt-5.2-codex")
              .replace("{fast}", "zai-coding-plan/glm-4.7")
          ),
        };
      });

      await runHandler({ mode: Mode.Plan });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");
      expect(resolveModelPlaceholders).toHaveBeenCalledWith(
        "Use {smart} and {fast}",
        { smart: "openai/gpt-5.2-codex", fast: "zai-coding-plan/glm-4.7" }
      );
    });

    it("should resolve model placeholders in run loop", async () => {
      let capturedRunCall: any;

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: true,
                version: "1.0.0",
              })
            );

            run = mock((prompt: string, model?: string) => {
              capturedRunCall = { prompt, model };
              return Promise.resolve({
                success: true,
                output: "Output with smart model and fast model <promise>COMPLETE</promise>",
              });
            });
          },
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(() => Promise.resolve("Use {smart} and {fast}")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt
              .replace("{smart}", "openai/gpt-5.2-codex")
              .replace("{fast}", "zai-coding-plan/glm-4.7")
          ),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");

      expect(resolveModelPlaceholders).toHaveBeenCalled();
      expect(capturedRunCall.prompt).toBe("Use openai/gpt-5.2-codex and zai-coding-plan/glm-4.7");
      expect(capturedRunCall.model).toBe("openai/gpt-5.2-codex");
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

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
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

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(() => Promise.resolve("Mocked prompt")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
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

    it("should use custom prompt when provided", async () => {
      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock((options) =>
            Promise.resolve(options.customPrompt || "Default prompt")
          ),
        };
      });

      let capturedPrompt: any;

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: true,
                version: "1.0.0",
              })
            );

            runWithPromptInteractive = mock((prompt: string) => {
              capturedPrompt = prompt;
              return Promise.resolve({ success: true });
            });
          },
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan, customPrompt: "My custom prompt" });

      const { resolvePrompt } = await import("../src/lib/prompts/resolver.js");
      expect(resolvePrompt).toHaveBeenCalledWith({
        mode: Mode.Plan,
        customPrompt: "My custom prompt",
      });
      expect(capturedPrompt).toContain("My custom prompt");
    });

    it("should use ask permission posture", async () => {
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

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan, permissionPosture: "ask" });

      expect(mockLog).toHaveBeenCalledWith("Permissions: ask");
    });

    it("should use custom smart model override", async () => {
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
          resolvePrompt: mock(() => Promise.resolve("Use {smart} for this")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt.replace("{smart}", "custom/smart-model")
          ),
        };
      });

      await stepHandler({ mode: Mode.Plan, smartModel: "custom/smart-model" });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");
      expect(resolveModelPlaceholders).toHaveBeenCalledWith(
        "Use {smart} for this",
        { smart: "custom/smart-model", fast: "zai-coding-plan/glm-4.7" }
      );
    });

    it("should use custom fast model override", async () => {
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
          resolvePrompt: mock(() => Promise.resolve("Use {fast} for this")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt.replace("{fast}", "custom/fast-model")
          ),
        };
      });

      await stepHandler({ mode: Mode.Plan, fastModel: "custom/fast-model" });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");
      expect(resolveModelPlaceholders).toHaveBeenCalledWith(
        "Use {fast} for this",
        { smart: "openai/gpt-5.2-codex", fast: "custom/fast-model" }
      );
    });

    it("should use both model overrides together", async () => {
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
          resolvePrompt: mock(() => Promise.resolve("Use {smart} and {fast}")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt
              .replace("{smart}", "custom/smart-model")
              .replace("{fast}", "custom/fast-model")
          ),
        };
      });

      await stepHandler({
        mode: Mode.Plan,
        smartModel: "custom/smart-model",
        fastModel: "custom/fast-model",
      });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");
      expect(resolveModelPlaceholders).toHaveBeenCalledWith(
        "Use {smart} and {fast}",
        { smart: "custom/smart-model", fast: "custom/fast-model" }
      );
    });

    it("should fail if runWithPromptInteractive fails", async () => {
      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      global.process.exit = mockExit;

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
                success: false,
                error: "Interactive run failed",
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

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockConsoleError = mock();
      global.console.error = mockConsoleError;

      await expect(stepHandler({ mode: Mode.Build })).rejects.toThrow(
        "process.exit(1)"
      );

      expect(mockConsoleError).toHaveBeenCalledWith("Interactive run failed");

      mockExit.mockRestore();
    });

    it("should resolve model placeholders and pass to interactive run", async () => {
      let capturedRunCall: any;

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() =>
              Promise.resolve({
                available: true,
                version: "1.0.0",
              })
            );

            runWithPromptInteractive = mock((prompt: string, model?: string) => {
              capturedRunCall = { prompt, model };
              return Promise.resolve({ success: true });
            });
          },
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(() => Promise.resolve("Use {smart} and {fast}")),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) =>
            prompt
              .replace("{smart}", "custom/smart-model")
              .replace("{fast}", "custom/fast-model")
          ),
        };
      });

      await stepHandler({
        mode: Mode.Plan,
        smartModel: "custom/smart-model",
        fastModel: "custom/fast-model",
      });

      const { resolveModelPlaceholders } = await import("../src/lib/models/resolver.js");

      expect(resolveModelPlaceholders).toHaveBeenCalled();
      expect(capturedRunCall.prompt).toBe("Use custom/smart-model and custom/fast-model");
      expect(capturedRunCall.model).toBe("custom/smart-model");
    });
  });

  describe("inspectHandler", () => {
    beforeEach(() => {
      mock.module("../src/lib/files/index.js", () => {
        return {
          fileExists: mock(() => Promise.resolve(false)),
          writeFile: mock(() => Promise.resolve()),
        };
      });
    });

    it("should read sessions, export all, and write JSON file", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
        },
        {
          iteration: 2,
          sessionId: "ses_test2",
          startedAt: "2024-01-01T00:01:00Z",
          mode: "plan",
          prompt: "Test prompt",
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      let exportCallCount = 0;
      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            export = mock(() => {
              exportCallCount++;
              return Promise.resolve({
                success: true,
                output: `Exported data ${exportCallCount}`,
              });
            });
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler();

      expect(exportCallCount).toBe(2);
      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_test1",
              iteration: 1,
              startedAt: "2024-01-01T00:00:00Z",
              export: "Exported data 1",
            },
            {
              sessionId: "ses_test2",
              iteration: 2,
              startedAt: "2024-01-01T00:01:00Z",
              export: "Exported data 2",
            },
          ],
          null,
          2
        )
      );
      expect(mockLog).toHaveBeenCalledWith("Exported 2 session(s) to inspect.json");
    });

    it("should output empty array for empty sessions", async () => {
      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve([])),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      global.console.log = mockLog;

      await inspectHandler();

      expect(writeFile).toHaveBeenCalledWith("inspect.json", "[]");
      expect(mockLog).toHaveBeenCalledWith("No sessions found in .ralphctl/ralph-sessions.json");
    });

    it("should skip session and continue when export fails", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
        },
        {
          iteration: 2,
          sessionId: "ses_test2",
          startedAt: "2024-01-01T00:01:00Z",
          mode: "plan",
          prompt: "Test prompt",
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      let exportCallCount = 0;
      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            export = mock(() => {
              exportCallCount++;
              if (exportCallCount === 1) {
                return Promise.resolve({
                  success: false,
                  output: "",
                  error: "Export failed",
                });
              }
              return Promise.resolve({
                success: true,
                output: "Exported data",
              });
            });
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler();

      expect(exportCallCount).toBe(2);
      expect(mockError).toHaveBeenCalledWith(
        "Warning: Failed to export session ses_test1 (iteration 1): Export failed"
      );
      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_test2",
              iteration: 2,
              startedAt: "2024-01-01T00:01:00Z",
              export: "Exported data",
            },
          ],
          null,
          2
        )
      );
      expect(mockLog).toHaveBeenCalledWith("Exported 1 session(s) to inspect.json");
    });

    it("should error when sessionId is missing", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

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

      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });
      global.process.exit = mockExit;

      const mockError = mock();
      global.console.error = mockError;

      await expect(inspectHandler()).rejects.toThrow("process.exit(1)");

      expect(mockError).toHaveBeenCalledWith(
        "Error: Missing sessionId for iteration 1"
      );

      mockExit.mockRestore();
    });

    it("should error when startedAt is missing", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "",
          mode: "plan",
          prompt: "Test prompt",
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

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

      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });
      global.process.exit = mockExit;

      const mockError = mock();
      global.console.error = mockError;

      await expect(inspectHandler()).rejects.toThrow("process.exit(1)");

      expect(mockError).toHaveBeenCalledWith(
        "Error: Missing startedAt for session ses_test1"
      );

      mockExit.mockRestore();
    });

    it("should error when iteration is invalid", async () => {
      const mockSessions = [
        {
          iteration: 0,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

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

      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });
      global.process.exit = mockExit;

      const mockError = mock();
      global.console.error = mockError;

      await expect(inspectHandler()).rejects.toThrow("process.exit(1)");

      expect(mockError).toHaveBeenCalledWith(
        "Error: Invalid iteration number 0 for session ses_test1"
      );

      mockExit.mockRestore();
    });

    it("should error when writeFile fails", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

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

      mock.module("../src/lib/files/index.js", () => {
        return {
          fileExists: mock(() => Promise.resolve(false)),
          writeFile: mock(() => Promise.reject(new Error("Write failed"))),
        };
      });

      const mockExit = mock((code: number) => {
        throw new Error(`process.exit(${code})`);
      });
      global.process.exit = mockExit;

      const mockError = mock();
      global.console.error = mockError;

      await expect(inspectHandler()).rejects.toThrow("process.exit(1)");

      expect(mockError).toHaveBeenCalledWith("Failed to write inspect file: Error: Write failed");

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
