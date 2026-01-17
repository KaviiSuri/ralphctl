export enum Command {
  Run = "run",
  Step = "step",
  Inspect = "inspect",
  Init = "init",
}

export enum Mode {
  Plan = "plan",
  Build = "build",
}

export interface RunOptions {
  command: Command;
  mode?: Mode;
}

export interface CliContext {
  cwd: string;
}
