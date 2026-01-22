import { runProcess, runProcessInteractive, type ProcessRunnerOptions, type ProcessRunnerResult } from "../process/runner.js";
import type { AgentAdapter, AgentRunOptions, AgentRunResult, AgentExportResult, AgentMetadata } from "../../domain/agent.js";
import type { ModelConfig } from "../../domain/types.js";
import * as fs from "node:fs/promises";

const CLAUDE_DEFAULT_SMART_MODEL = "claude-opus-4-5";
const CLAUDE_DEFAULT_FAST_MODEL = "claude-sonnet-4-5";

export interface ClaudeCodeAdapterOptions {
  cwd?: string;
  env?: Record<string, string>;
  headless?: boolean;
}

export class ClaudeCodeAdapter implements AgentAdapter {
  private options: ClaudeCodeAdapterOptions;
  private cachedVersion?: string;
  private cwd: string;

  constructor(options: ClaudeCodeAdapterOptions = {}) {
    this.options = { headless: true, ...options };
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
      sessionId: null,
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
      let projectDir: string | null = null;

      for (const dir of projectDirs) {
        try {
          const configPath = `${dir}/project.json`;
          const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
          if (config.path === this.cwd) {
            projectDir = dir;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!projectDir) {
        return {
          exportData: null,
          success: false,
          error: "Project not found in Claude Code directory",
        };
      }

      const chatFiles = await fs.readdir(projectDir);
      const filteredChatFiles = chatFiles.filter(f => f.startsWith("chat_") && f.endsWith(".jsonl"));

      if (filteredChatFiles.length === 0) {
        return {
          exportData: null,
          success: false,
          error: "No chat files found",
        };
      }

      const chatFileStats = await Promise.all(
        filteredChatFiles.map(async f => ({
          name: f,
          stat: await fs.stat(`${projectDir}/${f}`),
        }))
      );
      chatFileStats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
      const latestFile = chatFileStats[0].name;

      const content = await this.readChatFile(`${projectDir}/${latestFile}`);
      let exportData: unknown;

      try {
        exportData = content.split("\n")
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch {
        exportData = content;
      }

      return {
        exportData,
        success: true,
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

  getDefaultModels(): ModelConfig {
    return {
      smart: CLAUDE_DEFAULT_SMART_MODEL,
      fast: CLAUDE_DEFAULT_FAST_MODEL,
    };
  }

  getInstallationUrl(): string {
    return "https://claude.ai/code";
  }

  getUnavailableErrorMessage(): string {
    const metadata = this.getMetadata();
    return (
      `${metadata.displayName} (${metadata.cliCommand}) is not available.\n` +
      `Please install ${metadata.displayName} and ensure it's in your PATH.\n` +
      `Visit: ${this.getInstallationUrl()}`
    );
  }

  private buildCommandArgs(
    prompt: string,
    model: string,
    options?: AgentRunOptions,
    interactive: boolean = false
  ): string[] {
    const args: string[] = [];

    if (!interactive && this.options.headless) {
      args.push("-p");
    }

    if (model) {
      args.push("--model", model);
    }

    if (options?.agentFlags) {
      args.push(...options.agentFlags);
    }

    args.push(prompt);

    return args;
  }
}
