import { runProcess, runProcessInteractive, type ProcessRunnerResult, type ProcessRunnerOptions } from "../process/runner.js";

export interface OpenCodeAdapterOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface OpenCodeAvailabilityResult {
  available: boolean;
  version?: string;
  error?: string;
}

export interface OpenCodeRunResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface OpenCodeRunInteractiveResult {
  success: boolean;
  error?: string;
}

export class OpenCodeAdapter {
  private options: OpenCodeAdapterOptions;

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

  async checkAvailability(): Promise<OpenCodeAvailabilityResult> {
    const result = await this.executeCommand(["opencode", "--version"]);

    if (result.success && result.stdout.trim()) {
      const version = result.stdout.trim();
      return { available: true, version };
    }

    return {
      available: false,
      error: result.stderr || result.stdout || "OpenCode is not available",
    };
  }

  async run(prompt: string): Promise<OpenCodeRunResult> {
    const result = await this.executeCommand(["opencode", "run", prompt]);

    if (result.success) {
      return { success: true, output: result.stdout };
    }

    return {
      success: false,
      output: result.stdout,
      error: result.stderr || "Failed to run OpenCode",
    };
  }

  async runWithPrompt(prompt: string): Promise<OpenCodeRunResult> {
    const result = await this.executeCommand(["opencode", "--prompt", prompt]);

    if (result.success) {
      return { success: true, output: result.stdout };
    }

    return {
      success: false,
      output: result.stdout,
      error: result.stderr || "Failed to run OpenCode with prompt",
    };
  }

  async runWithPromptInteractive(prompt: string): Promise<OpenCodeRunInteractiveResult> {
    const options: ProcessRunnerOptions = {
      command: ["opencode", "--prompt", prompt],
      cwd: this.options.cwd,
      env: this.options.env,
    };

    const result = await runProcessInteractive(options);

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: `Failed to run OpenCode with prompt (exit code: ${result.exitCode})`,
    };
  }

  async export(sessionId: string): Promise<OpenCodeRunResult> {
    const result = await this.executeCommand(["opencode", "export", sessionId]);

    if (result.success) {
      return { success: true, output: result.stdout };
    }

    return {
      success: false,
      output: result.stdout,
      error: result.stderr || "Failed to export session",
    };
  }
}
