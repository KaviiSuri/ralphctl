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

export interface InspectOptions {
  output?: string;
}

export interface SessionState {
  iteration: number;
  sessionId: string;
  startedAt: string;
  mode: string;
  prompt: string;
  agent: AgentType;
  printMode?: boolean;
}

export interface SessionsFile {
  sessions: SessionState[];
  version?: string;
}

export interface InspectEntry {
  sessionId: string;
  iteration: number;
  startedAt: string;
  agent: AgentType;
  printMode?: boolean;
  export: unknown | null;
  error?: string;
}

export enum ModelRole {
  Smart = "smart",
  Fast = "fast",
}

export interface ModelConfig {
  smart: string;
  fast: string;
}

export const DEFAULT_SMART_MODEL = "openai/gpt-5.2-codex";
export const DEFAULT_FAST_MODEL = "zai-coding-plan/glm-4.7";

export function createModelConfig(smartOverride?: string, fastOverride?: string): ModelConfig {
  return {
    smart: smartOverride ?? DEFAULT_SMART_MODEL,
    fast: fastOverride ?? DEFAULT_FAST_MODEL,
  };
}

import { AgentType, type PermissionPosture } from "./agent.js";

export { AgentType };
