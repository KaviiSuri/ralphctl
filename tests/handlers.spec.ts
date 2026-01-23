import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Mode } from "../src/domain/types.js";
import { AgentType } from "../src/domain/agent.js";

let mockProcessExit: any;

import { runHandler } from "../src/lib/commands/run.js";
import { stepHandler } from "../src/lib/commands/step.js";
import { inspectHandler } from "../src/lib/commands/inspect.js";

describe("Command Handlers", () => {
  describe("runHandler", () => {
    const mockRunCalls: any[] = [];

    beforeEach(() => {
      mockRunCalls.length = 0;

      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock((prompt: string, model?: string) => {
            mockRunCalls.push({ prompt, model });
            return Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            });
          });
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });
    });

    it("should check opencode availability and fail if unavailable", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(false));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };

        const originalExit = process.exit;
        mockProcessExit = mock((code: number) => {
          throw new Error(`process.exit(${code})`);
        });

        return {
          createAgent: mock(async () => {
            const adapter = new MockAdapter() as any;
            const available = await adapter.checkAvailability();
            if (!available) {
              const metadata = adapter.getMetadata();
              console.error(`Error: ${metadata.displayName} is not available`);
              console.error(`CLI command '${metadata.cliCommand}' not found or not executable`);
              console.error(`\nPlease install ${metadata.displayName}: https://opencode.ai`);
              mockProcessExit(1);
            }
            return adapter;
          }),
        };
      });

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() => Promise.resolve(false));
            runInteractive = mock(() => Promise.resolve());
            getMetadata = mock(() => ({
              name: "opencode",
              displayName: "OpenCode",
              cliCommand: "opencode",
              version: "1.0.0",
            }));
            getDefaultModels = mock(() => ({
              smart: "openai/gpt-5.2-codex",
              fast: "zai-coding-plan/glm-4.7",
            }));
            getInstallationUrl = mock(() => "https://opencode.ai");
            getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
          },
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockConsoleError = mock();
      global.console.error = mockConsoleError;

      try {
        await expect(runHandler({ mode: Mode.Plan })).rejects.toThrow(
          "process.exit(1)"
        );

        expect(mockConsoleError).toHaveBeenCalledWith(
          "Error: OpenCode is not available"
        );
        expect(mockConsoleError).toHaveBeenCalledWith(
          "CLI command 'opencode' not found or not executable"
        );
        expect(mockConsoleError).toHaveBeenCalledWith(
          "\nPlease install OpenCode: https://opencode.ai"
        );
      } finally {
        mockProcessExit = undefined;
      }
    });

    it("should stop at max iterations without completion", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output without completion",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: false,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
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

      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));

          run = mock(() => {
            callCount++;
            if (callCount < 2) {
              return Promise.resolve({
                stdout: "Still working...",
                stderr: "",
                sessionId: `ses_test${callCount}`,
                completionDetected: false,
                exitCode: 0,
              });
            }
            return Promise.resolve({
              stdout: "Done! <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: `ses_test${callCount}`,
              completionDetected: true,
              exitCode: 0,
            });
          });
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));

          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));

          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));

          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));

          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));

          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));

          run = mock((prompt: string, model?: string) => {
            mockRunCalls.push({ prompt, model });
            return Promise.resolve({
              stdout: "Output with smart model and fast model <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            });
          });
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      expect(mockRunCalls.length).toBeGreaterThan(0);
      expect(mockRunCalls[0].prompt).toBe("Use openai/gpt-5.2-codex and zai-coding-plan/glm-4.7");
      expect(mockRunCalls[0].model).toBe("openai/gpt-5.2-codex");
    });

    it("should enable print mode by default for Claude Code", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "claude-code",
            displayName: "Claude Code",
            cliCommand: "claude",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "claude-opus-4-5",
            fast: "claude-sonnet-4-5",
          }));
          getInstallationUrl = mock(() => "https://claude.ai/code");
          getUnavailableErrorMessage = mock(() => "Claude Code (claude) is not available.");
        };
        return {
          createAgent: mock((cliAgent?: string, options?: any) => {
            expect(options?.headless).toBe(true);
            return Promise.resolve(new MockAdapter() as any);
          }),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, agent: AgentType.ClaudeCode });

      expect(mockLog).toHaveBeenCalledWith("Print mode: enabled");
    });

    it("should disable print mode when --no-print flag is passed for Claude Code", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "claude-code",
            displayName: "Claude Code",
            cliCommand: "claude",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "claude-opus-4-5",
            fast: "claude-sonnet-4-5",
          }));
          getInstallationUrl = mock(() => "https://claude.ai/code");
          getUnavailableErrorMessage = mock(() => "Claude Code (claude) is not available.");
        };
        return {
          createAgent: mock((cliAgent?: string, options?: any) => {
            expect(options?.headless).toBe(false);
            return Promise.resolve(new MockAdapter() as any);
          }),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, agent: AgentType.ClaudeCode, noPrint: true });

      expect(mockLog).toHaveBeenCalledWith("Print mode: disabled");
    });

    it("should not log print mode for OpenCode", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, agent: AgentType.OpenCode });

      expect(mockLog).toHaveBeenCalledWith("Running plan mode");
      expect(mockLog).toHaveBeenCalledWith("Permissions: allow-all");
      expect(mockLog).not.toHaveBeenCalledWith(expect.stringContaining("Print mode"));
    });

    it("should capture agent and printMode in SessionState for OpenCode", async () => {
      let capturedSession: any = null;

      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve([])),
          writeSessionsFile: mock((sessions: any[]) => {
            capturedSession = sessions[sessions.length - 1];
            return Promise.resolve();
          }),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, agent: AgentType.OpenCode });

      expect(capturedSession).not.toBeNull();
      expect(capturedSession.agent).toBe(AgentType.OpenCode);
      expect(capturedSession.printMode).toBe(true);
    });

    it("should capture agent and printMode in SessionState for Claude Code", async () => {
      let capturedSession: any = null;

      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "claude-code",
            displayName: "Claude Code",
            cliCommand: "claude",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "claude-opus-4-5",
            fast: "claude-sonnet-4-5",
          }));
          getInstallationUrl = mock(() => "https://claude.ai/code");
          getUnavailableErrorMessage = mock(() => "Claude Code (claude) is not available.");
        };
        return {
          createAgent: mock((cliAgent?: string, options?: any) => {
            return Promise.resolve(new MockAdapter() as any);
          }),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve([])),
          writeSessionsFile: mock((sessions: any[]) => {
            capturedSession = sessions[sessions.length - 1];
            return Promise.resolve();
          }),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, agent: AgentType.ClaudeCode });

      expect(capturedSession).not.toBeNull();
      expect(capturedSession.agent).toBe(AgentType.ClaudeCode);
      expect(capturedSession.printMode).toBe(true);
    });

    it("should capture printMode=false when --no-print is used", async () => {
      let capturedSession: any = null;

      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "claude-code",
            displayName: "Claude Code",
            cliCommand: "claude",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "claude-opus-4-5",
            fast: "claude-sonnet-4-5",
          }));
          getInstallationUrl = mock(() => "https://claude.ai/code");
          getUnavailableErrorMessage = mock(() => "Claude Code (claude) is not available.");
        };
        return {
          createAgent: mock((cliAgent?: string, options?: any) => {
            return Promise.resolve(new MockAdapter() as any);
          }),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve([])),
          writeSessionsFile: mock((sessions: any[]) => {
            capturedSession = sessions[sessions.length - 1];
            return Promise.resolve();
          }),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await runHandler({ mode: Mode.Plan, agent: AgentType.ClaudeCode, noPrint: true });

      expect(capturedSession).not.toBeNull();
      expect(capturedSession.agent).toBe(AgentType.ClaudeCode);
      expect(capturedSession.printMode).toBe(false);
    });
  });

  describe("stepHandler", () => {
    const mockRunInteractiveCalls: any[] = [];

    beforeEach(() => {
      mockRunInteractiveCalls.length = 0;

      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock((prompt: string, model?: string) => {
            mockRunInteractiveCalls.push({ prompt, model });
            return Promise.resolve();
          });
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });
    });

    it("should check opencode availability and use runInteractive", async () => {
      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan });

      expect(mockLog).toHaveBeenCalledWith("Running plan mode step");
      expect(mockLog).toHaveBeenCalledWith("Permissions: allow-all");
    });

    it("should fail if opencode is unavailable", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(false));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };

        mockProcessExit = mock((code: number) => {
          throw new Error(`process.exit(${code})`);
        });

        return {
          createAgent: mock(async () => {
            const adapter = new MockAdapter() as any;
            const available = await adapter.checkAvailability();
            if (!available) {
              const metadata = adapter.getMetadata();
              console.error(`Error: ${metadata.displayName} is not available`);
              console.error(`CLI command '${metadata.cliCommand}' not found or not executable`);
              console.error(`\nPlease install ${metadata.displayName}: https://opencode.ai`);
              mockProcessExit(1);
            }
            return adapter;
          }),
        };
      });

      mock.module("../src/lib/opencode/adapter.js", () => {
        return {
          OpenCodeAdapter: class {
            checkAvailability = mock(() => Promise.resolve(false));
            runInteractive = mock(() => Promise.resolve());
            getMetadata = mock(() => ({
              name: "opencode",
              displayName: "OpenCode",
              cliCommand: "opencode",
              version: "1.0.0",
            }));
            getDefaultModels = mock(() => ({
              smart: "openai/gpt-5.2-codex",
              fast: "zai-coding-plan/glm-4.7",
            }));
            getInstallationUrl = mock(() => "https://opencode.ai");
            getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
          },
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockConsoleError = mock();
      global.console.error = mockConsoleError;

      try {
        await expect(stepHandler({ mode: Mode.Build })).rejects.toThrow(
          "process.exit(1)"
        );

        expect(mockConsoleError).toHaveBeenCalledWith(
          "Error: OpenCode is not available"
        );
        expect(mockConsoleError).toHaveBeenCalledWith(
          "CLI command 'opencode' not found or not executable"
        );
        expect(mockConsoleError).toHaveBeenCalledWith(
          "\nPlease install OpenCode: https://opencode.ai"
        );
      } finally {
        mockProcessExit = undefined;
      }
    });

    it("should use custom prompt when provided", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock((prompt: string, model?: string) => {
            mockRunInteractiveCalls.push({ prompt, model });
            return Promise.resolve();
          });
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock((options) =>
            Promise.resolve(options.customPrompt || "Default prompt")
          ),
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
      expect(mockRunInteractiveCalls.length).toBeGreaterThan(0);
      expect(mockRunInteractiveCalls[0].prompt).toBe("My custom prompt");
    });

    it("should use ask permission posture", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock((prompt: string, model?: string) => {
            mockRunInteractiveCalls.push({ prompt, model });
            return Promise.resolve();
          });
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock((prompt: string, model?: string) => {
            mockRunInteractiveCalls.push({ prompt, model });
            return Promise.resolve();
          });
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock((prompt: string, model?: string) => {
            mockRunInteractiveCalls.push({ prompt, model });
            return Promise.resolve();
          });
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock((prompt: string, model?: string) => {
            mockRunInteractiveCalls.push({ prompt, model });
            return Promise.resolve();
          });
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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

    it("should resolve model placeholders and pass to interactive run", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock((prompt: string, model?: string) => {
            mockRunInteractiveCalls.push({ prompt, model });
            return Promise.resolve();
          });
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
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
      expect(mockRunInteractiveCalls.length).toBeGreaterThan(0);
      expect(mockRunInteractiveCalls[0].prompt).toBe("Use custom/smart-model and custom/fast-model");
      expect(mockRunInteractiveCalls[0].model).toBe("custom/smart-model");
    });

    it("should enable print mode by default for Claude Code", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "claude-code",
            displayName: "Claude Code",
            cliCommand: "claude",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "claude-opus-4-5",
            fast: "claude-sonnet-4-5",
          }));
          getInstallationUrl = mock(() => "https://claude.ai/code");
          getUnavailableErrorMessage = mock(() => "Claude Code (claude) is not available.");
        };
        return {
          createAgent: mock((cliAgent?: string, options?: any) => {
            expect(options?.headless).toBe(true);
            return Promise.resolve(new MockAdapter() as any);
          }),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan, agent: AgentType.ClaudeCode });

      expect(mockLog).toHaveBeenCalledWith("Print mode: enabled");
    });

    it("should disable print mode when --no-print flag is passed for Claude Code", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "claude-code",
            displayName: "Claude Code",
            cliCommand: "claude",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "claude-opus-4-5",
            fast: "claude-sonnet-4-5",
          }));
          getInstallationUrl = mock(() => "https://claude.ai/code");
          getUnavailableErrorMessage = mock(() => "Claude Code (claude) is not available.");
        };
        return {
          createAgent: mock((cliAgent?: string, options?: any) => {
            expect(options?.headless).toBe(false);
            return Promise.resolve(new MockAdapter() as any);
          }),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan, agent: AgentType.ClaudeCode, noPrint: true });

      expect(mockLog).toHaveBeenCalledWith("Print mode: disabled");
    });

    it("should not log print mode for OpenCode", async () => {
      mock.module("../src/lib/agents/factory.js", () => {
        const MockAdapter = class {
          checkAvailability = mock(() => Promise.resolve(true));
          run = mock(() =>
            Promise.resolve({
              stdout: "Iteration output <promise>COMPLETE</promise>",
              stderr: "",
              sessionId: "ses_test123",
              completionDetected: true,
              exitCode: 0,
            })
          );
          runInteractive = mock(() => Promise.resolve());
          getMetadata = mock(() => ({
            name: "opencode",
            displayName: "OpenCode",
            cliCommand: "opencode",
            version: "1.0.0",
          }));
          getDefaultModels = mock(() => ({
            smart: "openai/gpt-5.2-codex",
            fast: "zai-coding-plan/glm-4.7",
          }));
          getInstallationUrl = mock(() => "https://opencode.ai");
          getUnavailableErrorMessage = mock(() => "OpenCode (opencode) is not available.");
        };
        return {
          createAgent: mock(() => Promise.resolve(new MockAdapter() as any)),
        };
      });

      mock.module("../src/lib/prompts/resolver.js", () => {
        return {
          resolvePrompt: mock(({ mode, customPrompt, project }: any) => {
            let promptContent = customPrompt || "Mocked prompt";

            // Apply placeholder resolution
            const hasProjectPlaceholder = promptContent.includes("{project}");
            if (hasProjectPlaceholder && !project) {
              // Global mode: resolve to current directory
              promptContent = promptContent.replaceAll("{project}", ".");
            }

            if (project) {
              const projectPath = `projects/${project}`;
              promptContent = promptContent.replaceAll("{project}", projectPath);
            }

            return Promise.resolve(promptContent);
          }),
        };
      });

      mock.module("../src/lib/models/resolver.js", () => {
        return {
          resolveModelPlaceholders: mock((prompt) => prompt),
        };
      });

      const mockLog = mock();
      global.console.log = mockLog;

      await stepHandler({ mode: Mode.Plan, agent: AgentType.OpenCode });

      expect(mockLog).toHaveBeenCalledWith("Running plan mode step");
      expect(mockLog).toHaveBeenCalledWith("Permissions: allow-all");
      expect(mockLog).not.toHaveBeenCalledWith(expect.stringContaining("Print mode"));
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
          agent: AgentType.OpenCode,
        },
        {
          iteration: 2,
          sessionId: "ses_test2",
          startedAt: "2024-01-01T00:01:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
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
      const mockAdapter = {
        export: mock(() => {
          exportCallCount++;
          return Promise.resolve({
            exportData: `Exported data ${exportCallCount}`,
            success: true,
          });
        }),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
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
              agent: "opencode",
              export: "Exported data 1",
            },
            {
              sessionId: "ses_test2",
              iteration: 2,
              startedAt: "2024-01-01T00:01:00Z",
              agent: "opencode",
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
          agent: AgentType.OpenCode,
        },
        {
          iteration: 2,
          sessionId: "ses_test2",
          startedAt: "2024-01-01T00:01:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
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
      const mockAdapter = {
        export: mock(() => {
          exportCallCount++;
          if (exportCallCount === 1) {
            return Promise.resolve({
              exportData: null,
              success: false,
              error: "Export failed",
            });
          }
          return Promise.resolve({
            exportData: "Exported data",
            success: true,
          });
        }),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
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
              agent: "opencode",
              export: null,
              error: "Export failed",
            },
            {
              sessionId: "ses_test2",
              iteration: 2,
              startedAt: "2024-01-01T00:01:00Z",
              agent: "opencode",
              export: "Exported data",
            },
          ],
          null,
          2
        )
      );
    });

    it("should use default output file when no output option provided", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockAdapter = {
        export: mock(() =>
          Promise.resolve({
            exportData: "Exported data",
            success: true,
          })
        ),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler();

      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_test1",
              iteration: 1,
              startedAt: "2024-01-01T00:00:00Z",
              agent: "opencode",
              export: "Exported data",
            },
          ],
          null,
          2
        )
      );
      expect(mockLog).toHaveBeenCalledWith("Exported 1 session(s) to inspect.json");
    });

    it("should use custom output file when output option provided", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockAdapter = {
        export: mock(() =>
          Promise.resolve({
            exportData: "Exported data",
            success: true,
          })
        ),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler({ output: "custom-output.json" });

      expect(writeFile).toHaveBeenCalledWith(
        "custom-output.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_test1",
              iteration: 1,
              startedAt: "2024-01-01T00:00:00Z",
              agent: "opencode",
              export: "Exported data",
            },
          ],
          null,
          2
        )
      );
      expect(mockLog).toHaveBeenCalledWith("Exported 1 session(s) to custom-output.json");
    });

    it("should use custom output file for empty sessions", async () => {
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

      await inspectHandler({ output: "custom-empty.json" });

      expect(writeFile).toHaveBeenCalledWith("custom-empty.json", "[]");
      expect(mockLog).toHaveBeenCalledWith("No sessions found in .ralphctl/ralph-sessions.json");
    });

    it("should log warning and skip unavailable agent types", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
        {
          iteration: 2,
          sessionId: "ses_test2",
          startedAt: "2024-01-01T00:01:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.ClaudeCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockAdapter = {
        export: mock(() =>
          Promise.resolve({
            exportData: "Exported data",
            success: true,
          })
        ),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      class MockAgentUnavailableError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "AgentUnavailableError";
        }
      }

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock((agentType) => {
            if (agentType === AgentType.ClaudeCode) {
              return Promise.reject(new MockAgentUnavailableError("Claude Code is not available"));
            }
            return Promise.resolve(mockAdapter);
          }),
          AgentUnavailableError: MockAgentUnavailableError,
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockWarn = mock();
      global.console.log = mockLog;
      global.console.warn = mockWarn;

      await inspectHandler();

      expect(mockWarn).toHaveBeenCalledWith("Skipping sessions for claude-code (agent not available)");
      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_test1",
              iteration: 1,
              startedAt: "2024-01-01T00:00:00Z",
              agent: "opencode",
              export: "Exported data",
            },
            {
              sessionId: "ses_test2",
              iteration: 2,
              startedAt: "2024-01-01T00:01:00Z",
              agent: "claude-code",
              export: null,
              error: "Agent claude-code not available",
            },
          ],
          null,
          2
        )
      );
    });

    it("should catch runtime errors from adapter.export()", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockAdapter = {
        export: mock(() => Promise.reject(new Error("Disk full"))),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler();

      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_test1",
              iteration: 1,
              startedAt: "2024-01-01T00:00:00Z",
              agent: "opencode",
              export: null,
              error: "Error: Disk full",
            },
          ],
          null,
          2
        )
      );
    });

    it("should export sessions from multiple agent types", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_opencode1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
        {
          iteration: 2,
          sessionId: "ses_claude1",
          startedAt: "2024-01-01T00:01:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.ClaudeCode,
          printMode: true,
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
      const mockAdapterCreator = mock((agentType: AgentType) => {
        const adapter = {
          export: mock(() => {
            exportCallCount++;
            return Promise.resolve({
              exportData: agentType === AgentType.OpenCode ? "OpenCode export" : "Claude Code export",
              success: true,
            });
          }),
          runInteractive: mock(() => Promise.resolve()),
          getMetadata: mock(() => ({
            name: agentType,
            displayName: agentType === AgentType.OpenCode ? "OpenCode" : "Claude Code",
            cliCommand: agentType === AgentType.OpenCode ? "opencode" : "claude",
            version: "1.0.0",
          })),
          checkAvailability: mock(() => Promise.resolve(true)),
        };
        return Promise.resolve(adapter);
      });

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mockAdapterCreator,
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
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
      expect(mockAdapterCreator).toHaveBeenCalledWith(AgentType.OpenCode);
      expect(mockAdapterCreator).toHaveBeenCalledWith(AgentType.ClaudeCode);
      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_opencode1",
              iteration: 1,
              startedAt: "2024-01-01T00:00:00Z",
              agent: "opencode",
              printMode: undefined,
              export: "OpenCode export",
            },
            {
              sessionId: "ses_claude1",
              iteration: 2,
              startedAt: "2024-01-01T00:01:00Z",
              agent: "claude-code",
              printMode: true,
              export: "Claude Code export",
            },
          ],
          null,
          2
        )
      );
    });

    it("should populate printMode in InspectEntry", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.ClaudeCode,
          printMode: false,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockAdapter = {
        export: mock(() =>
          Promise.resolve({
            exportData: "Exported data",
            success: true,
          })
        ),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "claude-code",
          displayName: "Claude Code",
          cliCommand: "claude",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler();

      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify(
          [
            {
              sessionId: "ses_test1",
              iteration: 1,
              startedAt: "2024-01-01T00:00:00Z",
              agent: "claude-code",
              printMode: false,
              export: "Exported data",
            },
          ],
          null,
          2
        )
      );
    });

    it("should support export type as unknown (object data)", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const complexExportData = {
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
        metadata: {
          model: "gpt-4",
          timestamp: "2024-01-01T00:00:00Z",
        },
      };

      const mockAdapter = {
        export: mock(() =>
          Promise.resolve({
            exportData: complexExportData,
            success: true,
          })
        ),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler();

      const expectedInspectEntry = {
        sessionId: "ses_test1",
        iteration: 1,
        startedAt: "2024-01-01T00:00:00Z",
        agent: "opencode",
        export: complexExportData,
      };

      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify([expectedInspectEntry], null, 2)
      );
    });

    it("should support export type as null", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockAdapter = {
        export: mock(() =>
          Promise.resolve({
            exportData: null,
            success: true,
          })
        ),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      const { writeFile } = await import("../src/lib/files/index.js");
      const mockLog = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.error = mockError;

      await inspectHandler();

      const expectedInspectEntry = {
        sessionId: "ses_test1",
        iteration: 1,
        startedAt: "2024-01-01T00:00:00Z",
        agent: "opencode",
        export: null,
      };

      expect(writeFile).toHaveBeenCalledWith(
        "inspect.json",
        JSON.stringify([expectedInspectEntry], null, 2)
      );
    });

    it("should throw when createAgent fails with unexpected error", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.reject(new Error("Unexpected initialization error"))),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      await expect(inspectHandler()).rejects.toThrow("Unexpected initialization error");
    });

    it("should handle writeFile failures gracefully", async () => {
      const mockSessions = [
        {
          iteration: 1,
          sessionId: "ses_test1",
          startedAt: "2024-01-01T00:00:00Z",
          mode: "plan",
          prompt: "Test prompt",
          agent: AgentType.OpenCode,
        },
      ];

      mock.module("../src/lib/state/index.js", () => {
        return {
          readSessionsFile: mock(() => Promise.resolve(mockSessions)),
          writeSessionsFile: mock(() => Promise.resolve()),
          ensureRalphctlDir: mock(() => Promise.resolve()),
        };
      });

      const mockAdapter = {
        export: mock(() =>
          Promise.resolve({
            exportData: "Exported data",
            success: true,
          })
        ),
        runInteractive: mock(() => Promise.resolve()),
        getMetadata: mock(() => ({
          name: "opencode",
          displayName: "OpenCode",
          cliCommand: "opencode",
          version: "1.0.0",
        })),
        checkAvailability: mock(() => Promise.resolve(true)),
      };

      mock.module("../src/lib/agents/factory.js", () => {
        return {
          createAgent: mock(() => Promise.resolve(mockAdapter)),
          AgentUnavailableError: class extends Error {
            constructor(message: string) {
              super(message);
              this.name = "AgentUnavailableError";
            }
          },
        };
      });

      mock.module("../src/lib/files/index.js", () => {
        return {
          fileExists: mock(() => Promise.resolve(false)),
          writeFile: mock(() => Promise.reject(new Error("Permission denied"))),
        };
      });

      const mockLog = mock();
      const mockWarn = mock();
      const mockError = mock();
      global.console.log = mockLog;
      global.console.warn = mockWarn;
      global.console.error = mockError;

      await inspectHandler();

      expect(mockError).toHaveBeenCalledWith("Failed to write inspect file: Error: Permission denied");
      expect(mockWarn).toHaveBeenCalledWith("\nExport summary: 1/1 sessions succeeded, 0 failed");
    });
  });

  // Note: initHandler tests have been moved to tests/integration/init.spec.ts
  // to avoid mock.module() conflicts with unit tests for infrastructure modules.
  // Run with: bun test tests/integration/init.spec.ts
});
