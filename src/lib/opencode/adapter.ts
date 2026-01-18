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
  sessionId?: string;
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

  private extractSessionId(output: string): string | undefined {
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
        return sessionMatch ? sessionMatch[0] : undefined;
      }
    }

    return undefined;
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

  async run(prompt: string, model?: string): Promise<OpenCodeRunResult> {
    const command = model
      ? ["opencode", "run", "--model", model, prompt]
      : ["opencode", "run", prompt];
    
    const result = await this.executeCommand(command);

    if (result.success) {
      const sessionId = this.extractSessionId(result.stdout);
      return { success: true, output: result.stdout, sessionId };
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

  async runWithPromptInteractive(prompt: string, model?: string): Promise<OpenCodeRunInteractiveResult> {
    const command = model
      ? ["opencode", "--prompt", prompt, "--model", model]
      : ["opencode", "--prompt", prompt];
      
    const options: ProcessRunnerOptions = {
      command,
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
