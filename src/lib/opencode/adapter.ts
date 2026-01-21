import { runProcess, runProcessInteractive, type ProcessRunnerResult, type ProcessRunnerOptions } from "../process/runner.js";
import type { AgentAdapter, AgentRunOptions, AgentRunResult, AgentExportResult, AgentMetadata, PermissionPosture } from "../../domain/agent.js";

export interface OpenCodeAdapterOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export class OpenCodeAdapter implements AgentAdapter {
  private options: OpenCodeAdapterOptions;
  private cachedVersion?: string;

  constructor(options: OpenCodeAdapterOptions = {}) {
    this.options = options;
  }

  private async executeCommand(command: string[]): Promise<ProcessRunnerResult> {
    const options: ProcessRunnerOptions = {
      command,
      cwd: this.options.cwd,
      env: this.options.env,
    };

    return runProcess(options);
  }

  private extractSessionId(output: string): string | null {
    const patterns = [
      /id=ses_[a-zA-Z0-9]+/,
      /"id":"ses_[a-zA-Z0-9]+"/,
      /sessionId=ses_[a-zA-Z0-9]+/,
      /sessionID=ses_[a-zA-Z0-9]+/,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        const sessionMatch = match[0].match(/ses_[a-zA-Z0-9]+/);
        return sessionMatch ? sessionMatch[0] : null;
      }
    }

    return null;
  }

  private detectCompletion(output: string): boolean {
    return output.includes("<promise>COMPLETE</promise>");
  }

  async checkAvailability(): Promise<boolean> {
    const result = await this.executeCommand(["opencode", "--version"]);

    if (result.success && result.stdout.trim()) {
      this.cachedVersion = result.stdout.trim();
      return true;
    }

    return false;
  }

  async run(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<AgentRunResult> {
    const command: string[] = ["opencode", "run"];

    if (model) {
      command.push("--model", model);
    }

    if (options?.agentFlags) {
      command.push(...options.agentFlags);
    }

    command.push(prompt);

    const result = await this.executeCommand(command);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      sessionId: this.extractSessionId(result.stdout),
      completionDetected: this.detectCompletion(result.stdout),
      exitCode: result.exitCode ?? -1,
    };
  }

  async runInteractive(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<void> {
    const command: string[] = ["opencode", "--prompt", prompt];

    if (model) {
      command.push("--model", model);
    }

    if (options?.agentFlags) {
      command.push(...options.agentFlags);
    }

    const runnerOptions: ProcessRunnerOptions = {
      command,
      cwd: options?.cwd ?? this.options.cwd,
      env: options?.env ?? this.options.env,
    };

    await runProcessInteractive(runnerOptions);
  }

  async export(sessionId: string): Promise<AgentExportResult> {
    const result = await this.executeCommand(["opencode", "export", sessionId]);

    if (result.success) {
      return {
        exportData: result.stdout,
        success: true,
      };
    }

    return {
      exportData: result.stdout,
      success: false,
      error: result.stderr || "Failed to export session",
    };
  }

  getMetadata(): AgentMetadata {
    return {
      name: "opencode",
      displayName: "OpenCode",
      version: this.cachedVersion,
      cliCommand: "opencode",
    };
  }
}
