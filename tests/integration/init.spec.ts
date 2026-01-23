import { describe, it, expect, mock, beforeEach } from "bun:test";
import { initHandler } from "../../src/lib/commands/init.js";

describe("initHandler (integration)", () => {
  beforeEach(() => {
    // Set up mocks for file/io/templates
    mock.module("../../src/lib/files/index.js", () => {
      return {
        fileExists: mock(() => Promise.resolve(false)),
        writeFile: mock(() => Promise.resolve()),
      };
    });

    mock.module("../../src/lib/io/index.js", () => {
      return {
        confirmOverwrite: mock(() => Promise.resolve(false)),
      };
    });

    mock.module("../../src/lib/templates/index.js", () => {
      return {
        PLAN_TEMPLATE: "Mock PLAN template",
        BUILD_TEMPLATE: "Mock BUILD template",
      };
    });

    // Mock dependencies for merged init command
    mock.module("../../src/lib/tools/detection.js", () => {
      return {
        detectAvailableTools: mock(() => ({ claude: true, opencode: true, hasAny: true, hasBoth: true })),
      };
    });

    mock.module("../../src/lib/tools/prompting.js", () => {
      return {
        determineToolChoice: mock(() => Promise.resolve({ claude: true, opencode: true })),
      };
    });

    mock.module("../../src/lib/command-infrastructure.js", () => {
      return {
        createCommandFolders: mock(() => Promise.resolve({
          claudeReady: true,
          opencodeReady: true,
          claudePath: ".claude/commands",
          opencodePath: ".opencode/commands",
        })),
        installCommandFiles: mock(() => Promise.resolve({
          claudeInstalled: 7,
          opencodeInstalled: 7,
          claudePath: ".claude/commands",
          opencodePath: ".opencode/commands",
          errors: [],
        })),
      };
    });

    mock.module("../../src/lib/repo/verification.js", () => {
      return {
        verifyRepoRoot: mock(() => Promise.resolve({
          repoRootPath: "/fake/repo",
          isRepoRoot: true,
          userConfirmed: false,
        })),
      };
    });
  });

  it("should write both prompt files when they don't exist", async () => {
    const { fileExists, writeFile } = await import("../../src/lib/files/index.js");
    const mockLog = mock();
    global.console.log = mockLog;

    await initHandler({ force: false });

    expect(fileExists).toHaveBeenCalledWith("PROMPT_plan.md");
    expect(fileExists).toHaveBeenCalledWith("PROMPT_build.md");
    expect(writeFile).toHaveBeenCalledWith("PROMPT_plan.md", "Mock PLAN template");
    expect(writeFile).toHaveBeenCalledWith("PROMPT_build.md", "Mock BUILD template");
    expect(mockLog).toHaveBeenCalledWith("Created PROMPT_plan.md");
    expect(mockLog).toHaveBeenCalledWith("Created PROMPT_build.md");
    expect(mockLog).toHaveBeenCalledWith("  ✓ Prompt templates created");
  });

  it("should set up command infrastructure", async () => {
    const { detectAvailableTools } = await import("../../src/lib/tools/detection.js");
    const { determineToolChoice } = await import("../../src/lib/tools/prompting.js");
    const { createCommandFolders, installCommandFiles } = await import("../../src/lib/command-infrastructure.js");
    const { verifyRepoRoot } = await import("../../src/lib/repo/verification.js");
    const mockLog = mock();
    global.console.log = mockLog;

    await initHandler({ force: false });

    expect(detectAvailableTools).toHaveBeenCalled();
    expect(determineToolChoice).toHaveBeenCalled();
    expect(verifyRepoRoot).toHaveBeenCalled();
    expect(createCommandFolders).toHaveBeenCalled();
    expect(installCommandFiles).toHaveBeenCalled();
  });

  it("should prompt for confirmation when files exist and force is false", async () => {
    mock.module("../../src/lib/files/index.js", () => {
      return {
        fileExists: mock(() => Promise.resolve(true)),
        writeFile: mock(() => Promise.resolve()),
      };
    });

    mock.module("../../src/lib/io/index.js", () => {
      return {
        confirmOverwrite: mock(() => Promise.resolve(false)),
      };
    });

    mock.module("../../src/lib/templates/index.js", () => {
      return {
        PLAN_TEMPLATE: "Mock PLAN template",
        BUILD_TEMPLATE: "Mock BUILD template",
      };
    });

    const { confirmOverwrite } = await import("../../src/lib/io/index.js");
    const mockLog = mock();
    global.console.log = mockLog;

    await initHandler({ force: false });

    expect(confirmOverwrite).toHaveBeenCalledWith("PROMPT_plan.md");
    expect(confirmOverwrite).toHaveBeenCalledWith("PROMPT_build.md");
    expect(mockLog).toHaveBeenCalledWith("Skipping PROMPT_plan.md");
    expect(mockLog).toHaveBeenCalledWith("Skipping PROMPT_build.md");
    expect(mockLog).toHaveBeenCalledWith("  ⚠ Prompt templates skipped (already exist)");
  });

  it("should overwrite when user confirms", async () => {
    mock.module("../../src/lib/files/index.js", () => {
      return {
        fileExists: mock(() => Promise.resolve(true)),
        writeFile: mock(() => Promise.resolve()),
      };
    });

    mock.module("../../src/lib/io/index.js", () => {
      return {
        confirmOverwrite: mock(() => Promise.resolve(true)),
      };
    });

    mock.module("../../src/lib/templates/index.js", () => {
      return {
        PLAN_TEMPLATE: "Mock PLAN template",
        BUILD_TEMPLATE: "Mock BUILD template",
      };
    });

    const { writeFile } = await import("../../src/lib/files/index.js");
    const mockLog = mock();
    global.console.log = mockLog;

    await initHandler({ force: false });

    expect(writeFile).toHaveBeenCalledWith("PROMPT_plan.md", "Mock PLAN template");
    expect(writeFile).toHaveBeenCalledWith("PROMPT_build.md", "Mock BUILD template");
    expect(mockLog).toHaveBeenCalledWith("Created PROMPT_plan.md");
    expect(mockLog).toHaveBeenCalledWith("Created PROMPT_build.md");
    expect(mockLog).toHaveBeenCalledWith("  ✓ Prompt templates created");
  });

  it("should skip confirmation when force is true", async () => {
    mock.module("../../src/lib/files/index.js", () => {
      return {
        fileExists: mock(() => Promise.resolve(true)),
        writeFile: mock(() => Promise.resolve()),
      };
    });

    mock.module("../../src/lib/io/index.js", () => {
      return {
        confirmOverwrite: mock(() => Promise.resolve(false)),
      };
    });

    mock.module("../../src/lib/templates/index.js", () => {
      return {
        PLAN_TEMPLATE: "Mock PLAN template",
        BUILD_TEMPLATE: "Mock BUILD template",
      };
    });

    const { writeFile } = await import("../../src/lib/files/index.js");
    const { confirmOverwrite } = await import("../../src/lib/io/index.js");
    const mockLog = mock();
    global.console.log = mockLog;

    await initHandler({ force: true });

    expect(confirmOverwrite).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith("PROMPT_plan.md", "Mock PLAN template");
    expect(writeFile).toHaveBeenCalledWith("PROMPT_build.md", "Mock BUILD template");
    expect(mockLog).toHaveBeenCalledWith("Created PROMPT_plan.md");
    expect(mockLog).toHaveBeenCalledWith("Created PROMPT_build.md");
    expect(mockLog).toHaveBeenCalledWith("  ✓ Prompt templates created");
  });
});
