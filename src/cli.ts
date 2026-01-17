import { Cli, Types, friendlyErrorPlugin, notFoundPlugin } from "clerc";
import { Mode } from "./domain/types.js";

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
    const mode = ctx.parameters.mode;
    console.log(`Running ${mode} mode (not yet implemented)`);
  })
  .command("step", "Run a single interactive iteration", {
    parameters: [
      {
        key: "<mode>",
        type: Types.Enum(Mode.Plan, Mode.Build),
        description: "Plan or build mode",
      },
    ],
  })
  .on("step", async (ctx) => {
    const mode = ctx.parameters.mode;
    console.log(`Stepping in ${mode} mode (not yet implemented)`);
  })
  .command("inspect", "Inspect run exports")
  .on("inspect", async () => {
    console.log("Inspect command (not yet implemented)");
  })
  .command("init", "Initialize default prompt templates")
  .on("init", async () => {
    console.log("Init command (not yet implemented)");
  })
  .parse();
