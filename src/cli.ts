import { Cli, Types, friendlyErrorPlugin, notFoundPlugin } from "clerc";
import path from "path";
import { Mode, type InitOptions } from "./domain/types.js";
import { runHandler } from "./lib/commands/run.js";
import { stepHandler } from "./lib/commands/step.js";
import { inspectHandler } from "./lib/commands/inspect.js";
import { initHandler } from "./lib/commands/init.js";

const getCommandName = (): string => {
  if (!process.argv[1]) return "ralphctl";
  
  const name = path.basename(process.argv[1]);
  return name || "ralphctl";
};

const cli = Cli()
  .scriptName(getCommandName())
  .name("ralphctl")
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
    flags: {
      "max-iterations": {
        type: Number,
        description: "Maximum number of iterations before stopping",
        default: 10,
      },
      "permission-posture": {
        type: Types.Enum("allow-all", "ask"),
        description: "Permission posture for file operations",
        default: "allow-all",
      },
      "smart-model": {
        type: String,
        description: "Override smart model (default: openai/gpt-5.2-codex)",
      },
      "fast-model": {
        type: String,
        description: "Override fast model (default: zai-coding-plan/glm-4.7)",
      },
    },
  })
  .on("run", async (ctx) => {
    await runHandler({
      mode: ctx.parameters.mode,
      maxIterations: ctx.flags["max-iterations"],
      permissionPosture: ctx.flags["permission-posture"] as "allow-all" | "ask",
      smartModel: ctx.flags["smart-model"],
      fastModel: ctx.flags["fast-model"],
    });
  })
  .command("step", "Run a single interactive iteration", {
    parameters: [
      {
        key: "<mode>",
        type: Types.Enum(Mode.Plan, Mode.Build),
        description: "Plan or build mode",
      },
      {
        key: "[prompt]",
        type: String,
        description: "Custom prompt (overrides default template)",
      },
    ],
    flags: {
      "permission-posture": {
        type: Types.Enum("allow-all", "ask"),
        description: "Permission posture for file operations",
        default: "allow-all",
      },
      "smart-model": {
        type: String,
        description: "Override smart model (default: openai/gpt-5.2-codex)",
      },
      "fast-model": {
        type: String,
        description: "Override fast model (default: zai-coding-plan/glm-4.7)",
      },
    },
  })
  .on("step", async (ctx) => {
    await stepHandler({
      mode: ctx.parameters.mode,
      customPrompt: ctx.parameters.prompt,
      permissionPosture: ctx.flags["permission-posture"] as "allow-all" | "ask",
      smartModel: ctx.flags["smart-model"],
      fastModel: ctx.flags["fast-model"],
    });
  })
  .command("inspect", "Inspect run exports")
  .on("inspect", async () => {
    await inspectHandler();
  })
  .command("init", "Initialize default prompt templates", {
    flags: {
      force: {
        type: Boolean,
        description: "Force overwrite existing prompt files",
        default: false,
      },
    },
  })
  .on("init", async (ctx) => {
    await initHandler({ force: ctx.flags.force as boolean });
  })
  .parse();
