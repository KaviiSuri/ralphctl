import { Cli, Types, friendlyErrorPlugin, notFoundPlugin } from "clerc";
import { Mode } from "./domain/types.js";
import { runHandler } from "./lib/commands/run.js";
import { stepHandler } from "./lib/commands/step.js";
import { inspectHandler } from "./lib/commands/inspect.js";
import { initHandler } from "./lib/commands/init.js";

const cli = Cli()
  .scriptName("ralphctl")
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
  })
  .on("run", async (ctx) => {
    await runHandler({ mode: ctx.parameters.mode });
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
  })
  .on("step", async (ctx) => {
    await stepHandler({ mode: ctx.parameters.mode, customPrompt: ctx.parameters.prompt });
  })
  .command("inspect", "Inspect run exports")
  .on("inspect", async () => {
    await inspectHandler();
  })
  .command("init", "Initialize default prompt templates")
  .on("init", async () => {
    await initHandler();
  })
  .parse();
