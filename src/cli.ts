#!/usr/bin/env bun
import { Cli, Types, friendlyErrorPlugin, notFoundPlugin } from "clerc";
import path from "path";
import { Mode, type InitOptions } from "./domain/types.js";
import { AgentType } from "./domain/agent.js";
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
      project: {
        type: String,
        description: "Project name for scoped execution (uses projects/<name>/) [alias: -p]",
      },
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
      agent: {
        type: Types.Enum(AgentType.OpenCode, AgentType.ClaudeCode),
        description: "Agent to use (default: opencode)",
        default: AgentType.OpenCode,
      },
      "no-print": {
        type: Boolean,
        description: "Disable Claude Code print mode (shows interactive prompts)",
        default: false,
      },
    },
  })
  .on("run", async (ctx) => {
    await runHandler({
      mode: ctx.parameters.mode,
      project: ctx.flags.project as string | undefined,
      maxIterations: ctx.flags["max-iterations"],
      permissionPosture: ctx.flags["permission-posture"] as "allow-all" | "ask",
      smartModel: ctx.flags["smart-model"],
      fastModel: ctx.flags["fast-model"],
      agent: ctx.flags.agent as AgentType,
      noPrint: ctx.flags["no-print"] as boolean,
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
      project: {
        type: String,
        description: "Project name for scoped execution (uses projects/<name>/) [alias: -p]",
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
      agent: {
        type: Types.Enum(AgentType.OpenCode, AgentType.ClaudeCode),
        description: "Agent to use (default: opencode)",
        default: AgentType.OpenCode,
      },
      "no-print": {
        type: Boolean,
        description: "Disable Claude Code print mode (shows interactive prompts)",
        default: false,
      },
    },
  })
  .on("step", async (ctx) => {
    await stepHandler({
      mode: ctx.parameters.mode,
      project: ctx.flags.project as string | undefined,
      customPrompt: ctx.parameters.prompt,
      permissionPosture: ctx.flags["permission-posture"] as "allow-all" | "ask",
      smartModel: ctx.flags["smart-model"],
      fastModel: ctx.flags["fast-model"],
      agent: ctx.flags.agent as AgentType,
      noPrint: ctx.flags["no-print"] as boolean,
    });
  })
  .command("inspect", "Inspect run exports", {
    flags: {
      project: {
        type: String,
        description: "Filter sessions by project name",
      },
      output: {
        type: String,
        description: "Output file path (default: inspect.json)",
      },
    },
  })
  .on("inspect", async (ctx) => {
    await inspectHandler({
      project: ctx.flags.project as string | undefined,
      output: ctx.flags.output as string,
    });
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
