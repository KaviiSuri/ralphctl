import type { ModelConfig } from "./types.js";

export type PermissionPosture = "allow-all" | "ask";

export interface AgentAdapter {
  checkAvailability(): Promise<boolean>;

  run(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<AgentRunResult>;

  runInteractive(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<void>;

  export(sessionId: string): Promise<AgentExportResult>;

  getMetadata(): AgentMetadata;

  getDefaultModels(): ModelConfig;

  getInstallationUrl(): string;

  getUnavailableErrorMessage(): string;
}

export interface AgentRunOptions {
  permissionPosture?: PermissionPosture;
  cwd?: string;
  env?: Record<string, string>;
  agentFlags?: string[];
}

export interface AgentRunResult {
  stdout: string;
  stderr: string;
  sessionId: string | null;
  completionDetected: boolean;
  exitCode: number;
}

export interface AgentExportResult {
  exportData: unknown;
  success: boolean;
  error?: string;
}

export interface AgentMetadata {
  name: string;
  displayName: string;
  version?: string;
  cliCommand: string;
}

export enum AgentType {
  OpenCode = "opencode",
  ClaudeCode = "claude-code",
}
