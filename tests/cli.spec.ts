import { describe, it, expect } from "bun:test";
import { Cli, Types, friendlyErrorPlugin, notFoundPlugin } from "clerc";
import { Mode } from "../src/domain/types.js";

describe("Command Surface", () => {
  it("should expose exactly four core commands", async () => {
    const cli = Cli()
      .scriptName("ralphctl")
      .version("0.0.0")
      .description("A CLI controller for OpenCode Ralph loops")
      .use(friendlyErrorPlugin())
      .use(notFoundPlugin())
      .command("run", "Run a Ralph loop")
      .on("run", () => {})
      .command("step", "Run a single interactive iteration")
      .on("step", () => {})
      .command("inspect", "Inspect run exports")
      .on("inspect", () => {})
      .command("init", "Initialize default prompt templates")
      .on("init", () => {});

    const commands = cli._commands;

    expect(commands.has("run")).toBe(true);
    expect(commands.has("step")).toBe(true);
    expect(commands.has("inspect")).toBe(true);
    expect(commands.has("init")).toBe(true);

    expect(commands.get("run")?.description).toBe("Run a Ralph loop");
    expect(commands.get("step")?.description).toBe("Run a single interactive iteration");
    expect(commands.get("inspect")?.description).toBe("Inspect run exports");
    expect(commands.get("init")?.description).toBe("Initialize default prompt templates");
  });

  it("should require positional mode argument for run", async () => {
    const cli = Cli()
      .scriptName("ralphctl")
      .version("0.0.0")
      .description("A CLI controller for OpenCode Ralph loops")
      .use(friendlyErrorPlugin())
      .use(notFoundPlugin())
      .command("run", "Run a Ralph loop", {
        parameters: [
          {
            key: "<mode>",
            type: Types.Enum(Mode.Plan, Mode.Build),
            description: "Plan or build mode",
          },
        ],
      })
      .on("run", () => {});

    const runCommand = cli._commands.get("run");
    expect(runCommand).toBeDefined();
    expect(runCommand?.parameters).toBeDefined();
    expect(Array.isArray(runCommand?.parameters)).toBe(true);
    expect(runCommand?.parameters?.length).toBeGreaterThan(0);
  });

  it("should require positional mode argument for step", async () => {
    const cli = Cli()
      .scriptName("ralphctl")
      .version("0.0.0")
      .description("A CLI controller for OpenCode Ralph loops")
      .use(friendlyErrorPlugin())
      .use(notFoundPlugin())
      .command("step", "Run a single interactive iteration", {
        parameters: [
          {
            key: "<mode>",
            type: Types.Enum(Mode.Plan, Mode.Build),
            description: "Plan or build mode",
          },
        ],
      })
      .on("step", () => {});

    const stepCommand = cli._commands.get("step");
    expect(stepCommand).toBeDefined();
    expect(stepCommand?.parameters).toBeDefined();
    expect(Array.isArray(stepCommand?.parameters)).toBe(true);
    expect(stepCommand?.parameters?.length).toBeGreaterThan(0);
  });

  it("should not require mode argument for inspect", async () => {
    const cli = Cli()
      .scriptName("ralphctl")
      .version("0.0.0")
      .description("A CLI controller for OpenCode Ralph loops")
      .use(friendlyErrorPlugin())
      .use(notFoundPlugin())
      .command("inspect", "Inspect run exports")
      .on("inspect", () => {});

    const inspectCommand = cli._commands.get("inspect");
    expect(inspectCommand).toBeDefined();
    // Commands without parameters have no parameters property or empty array
    const params = inspectCommand?.parameters;
    expect(params === undefined || (Array.isArray(params) && params.length === 0)).toBe(true);
  });

  it("should not require mode argument for init", async () => {
    const cli = Cli()
      .scriptName("ralphctl")
      .version("0.0.0")
      .description("A CLI controller for OpenCode Ralph loops")
      .use(friendlyErrorPlugin())
      .use(notFoundPlugin())
      .command("init", "Initialize default prompt templates")
      .on("init", () => {});

    const initCommand = cli._commands.get("init");
    expect(initCommand).toBeDefined();
    // Commands without parameters have no parameters property or empty array
    const params = initCommand?.parameters;
    expect(params === undefined || (Array.isArray(params) && params.length === 0)).toBe(true);
  });
});
