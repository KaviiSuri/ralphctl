import { runProcess, runProcessInteractive, type ProcessRunnerOptions, type ProcessRunnerResult } from "../process/runner.js";
import type { AgentAdapter, AgentRunOptions, AgentRunResult, AgentExportResult, AgentMetadata } from "../../domain/agent.js";
import * as fs from "node:fs/promises";

export interface ClaudeCodeAdapterOptions {
  cwd?: string;
  env?: Record<string, string>;
  useProjectMode?: boolean;
}

export class ClaudeCodeAdapter implements AgentAdapter {
  private options: ClaudeCodeAdapterOptions;
  private cachedVersion?: string;
  private cwd: string;

  constructor(options: ClaudeCodeAdapterOptions = {}) {
    this.options = { useProjectMode: true, ...options };
    this.cwd = options.cwd ?? process.cwd();
  }

  private async executeCommand(args: string[]): Promise<ProcessRunnerResult> {
    const options: ProcessRunnerOptions = {
      command: ["claude", ...args],
      cwd: this.cwd,
      env: this.options.env,
    };

    return runProcess(options);
  }

  private extractSessionId(output: string): string | null {
    const patterns = [
      /Session ID:\s*([a-f0-9-]+)/i,
      /"sessionId":\s*"([a-f0-9-]+)"/,
      /\[Session:\s*([a-f0-9-]+)\]/i,
      /session:\s*([a-f0-9-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  private detectCompletion(output: string): boolean {
    return output.includes("<promise>COMPLETE</promise>");
  }

  async checkAvailability(): Promise<boolean> {
    const result = await this.executeCommand(["--version"]);

    if (result.success && result.stdout.trim()) {
      const match = result.stdout.match(/Claude Code\s+v?([\d.]+)/i);
      if (match?.[1]) {
        this.cachedVersion = match[1];
        return true;
      }
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
    const args = this.buildCommandArgs(prompt, model, options, false);
    const result = await this.executeCommand(args);

    const combinedOutput = result.stdout + result.stderr;

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      sessionId: this.extractSessionId(combinedOutput),
      completionDetected: this.detectCompletion(combinedOutput),
      exitCode: result.exitCode ?? -1,
    };
  }

  async runInteractive(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<void> {
    const args = this.buildCommandArgs(prompt, model, options, true);

    const runnerOptions: ProcessRunnerOptions = {
      command: ["claude", ...args],
      cwd: options?.cwd ?? this.cwd,
      env: options?.env ?? this.options.env,
    };

    await runProcessInteractive(runnerOptions);
  }

  async export(sessionId: string): Promise<AgentExportResult> {
    try {
      const claudePath = `${process.env.HOME || process.env.USERPROFILE}/.claude`;
      const projectsDir = `${claudePath}/projects`;

      const projectDirs = await this.listProjectDirectories(projectsDir);

      for (const projectDir of projectDirs) {
        const chatFile = await this.findChatFile(projectDir, sessionId);
        if (chatFile) {
          const content = await this.readChatFile(chatFile);
          let exportData: unknown;

          try {
            exportData = JSON.parse(content);
          } catch {
            exportData = content;
          }

          return {
            exportData,
            success: true,
          };
        }
      }

      return {
        exportData: null,
        success: false,
        error: `Session ${sessionId} not found in any project`,
      };
    } catch (error) {
      return {
        exportData: null,
        success: false,
        error: String(error),
      };
    }
  }

  private async listProjectDirectories(projectsDir: string): Promise<string[]> {
    try {
      const dirs: string[] = [];
      const entries = await fs.readdir(projectsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs.push(`${projectsDir}/${entry.name}`);
        }
      }

      return dirs;
    } catch {
      return [];
    }
  }

  private async findChatFile(projectDir: string, sessionId: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(projectDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.jsonl') && entry.name.includes(sessionId)) {
          return `${projectDir}/${entry.name}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async readChatFile(filePath: string): Promise<string> {
    try {
      const file = Bun.file(filePath);
      return await file.text();
    } catch {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  getMetadata(): AgentMetadata {
    return {
      name: "claude-code",
      displayName: "Claude Code",
      version: this.cachedVersion,
      cliCommand: "claude",
    };
  }

  private buildCommandArgs(
    prompt: string,
    model: string,
    options?: AgentRunOptions,
    interactive: boolean = false
  ): string[] {
    const args: string[] = [];

    if (!interactive && this.options.useProjectMode) {
      args.push("-p");
    }

    if (model) {
      args.push("--model", model);
    }

    if (options?.agentFlags) {
      args.push(...options.agentFlags);
    }

    if (interactive) {
      args.push(prompt);
    } else {
      args.push("--prompt", prompt);
    }

    return args;
  }
}
