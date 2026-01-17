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

export interface InitOptions {
  force?: boolean;
}

export interface SessionState {
  iteration: number;
  sessionId: string;
  startedAt: string;
  mode: string;
  prompt: string;
}

export interface SessionsFile {
  sessions: SessionState[];
}
