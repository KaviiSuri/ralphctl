# JTBD-102-SPEC-002: ClaudeCodeAdapter Implementation

**Parent JTBD**: JTBD-102 - Adapt Agent-Specific Execution Patterns
**Status**: Not Started
**Priority**: P0 (Core Feature)
**Depends On**: JTBD-102-SPEC-001

---

## Purpose

Implement the `AgentAdapter` interface for Claude Code CLI, enabling rctl to execute Claude Code in both headless and interactive modes with proper session management and print mode support.

## Scope

**In Scope**:
- ClaudeCodeAdapter class implementing AgentAdapter interface
- Claude Code CLI command construction
- Print mode (`-p`) flag handling for headless execution
- Session export from JSONL files in `~/.claude/projects/*/chat_*.jsonl`
- Completion detection from CLI output
- Claude Code-specific environment configuration

**Out of Scope**:
- Claude API direct integration (CLI only)
- Custom Claude Code features beyond what CLI provides
- Model capability detection
- Claude Code installation or configuration
- Session ID extraction (not available from CLI output)

---

## Behavioral Requirements

### 1. Class Structure

Create `src/lib/agents/claude-code-adapter.ts`:

```typescript
import type {
  AgentAdapter,
  AgentRunOptions,
  AgentRunResult,
  AgentExportResult,
  AgentMetadata,
} from "../../domain/agent";
import { runProcess, runProcessInteractive } from "../process/runner";

export class ClaudeCodeAdapter implements AgentAdapter {
  constructor(
    private readonly cwd: string,
    private readonly headless: boolean = true  // Controls -p flag for print/headless mode
  ) {}

  async checkAvailability(): Promise<boolean> {
    // Implementation
  }

  async run(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<AgentRunResult> {
    // Implementation
  }

  async runInteractive(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<void> {
    // Implementation
  }

  async export(sessionId: string): Promise<AgentExportResult> {
    // Implementation
  }

  getMetadata(): AgentMetadata {
    return {
      name: "claude-code",
      displayName: "Claude Code",
      cliCommand: "claude",
      version: this.version,
    };
  }

  private version?: string;

  private extractSessionId(output: string): string | null {
    // Implementation
  }

  private detectCompletion(output: string): boolean {
    // Implementation
  }

  private buildCommandArgs(
    prompt: string,
    model: string,
    options?: AgentRunOptions,
    interactive: boolean = false
  ): string[] {
    // Implementation
  }
}
```

### 2. Availability Check

**Command**: `claude --version`

**Behavior**:
- Execute version check command
- Parse version from output (format: "Claude Code v1.2.3")
- Store version in instance variable
- Return `true` if command succeeds with exit code 0
- Return `false` if command fails or is not found
- Never throw exceptions

**Implementation**:
```typescript
async checkAvailability(): Promise<boolean> {
  try {
    const result = await runProcess("claude --version", {
      cwd: this.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    if (result.exitCode === 0) {
      // Extract version: "Claude Code v1.2.3" -> "1.2.3"
      const match = result.stdout.match(/v([\d.]+)/);
      this.version = match?.[1];
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```

### 3. Headless Execution (run)

**Command Construction**:
```
claude -p --model <model> <prompt>
```

**Flags**:
- `-p`: Print/headless mode (non-interactive, output to stdout/stderr)
- `--model`: Model selection (e.g., "claude-sonnet-4-5-20250929")
- `<prompt>`: Instruction prompt (passed as argument, no --prompt flag)

**Session ID Handling**:
- Claude Code CLI does not output session IDs in a predictable format
- Track session by timestamp/chat file instead of extracting from CLI output
- Session files stored in `~/.claude/projects/*/chat_*.jsonl`
- Return null for sessionId in run() result (not available from CLI)

**Completion Detection**:
- Search for `<promise>COMPLETE</promise>` marker
- Case-insensitive search
- Return true if found anywhere in stdout or stderr

**Implementation**:
```typescript
async run(
  prompt: string,
  model: string,
  options?: AgentRunOptions
): Promise<AgentRunResult> {
  const args = this.buildCommandArgs(prompt, model, options, false);
  const commandStr = `claude ${args.join(" ")}`;

  const result = await runProcess(commandStr, {
    cwd: options?.cwd || this.cwd,
    env: options?.env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const combinedOutput = result.stdout + result.stderr;

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    sessionId: null, // Claude Code CLI doesn't output session IDs
    completionDetected: this.detectCompletion(combinedOutput),
    exitCode: result.exitCode,
  };
}
```

### 4. Interactive Execution (runInteractive)

**Command Construction**:
```
claude --model <model> <prompt>
```

**Behavior**:
- No `-p` flag (interactive mode doesn't use print mode)
- `--model`: Model selection
- `<prompt>`: Instruction prompt (passed as argument)
- Use `runProcessInteractive` to inherit stdio
- User interacts directly with Claude Code TUI
- Wait for user to exit
- No output capture or parsing

**Implementation**:
```typescript
async runInteractive(
  prompt: string,
  model: string,
  options?: AgentRunOptions
): Promise<void> {
  const args = this.buildCommandArgs(prompt, model, options, true);
  const commandStr = `claude ${args.join(" ")}`;

  await runProcessInteractive(commandStr, {
    cwd: options?.cwd || this.cwd,
    env: options?.env,
  });
}
```

### 5. Session Export

**Behavior**:
- Read session data from Claude Code's local JSONL storage files
- Files are located at `~/.claude/projects/*/chat_*.jsonl`
- Find the most recent chat file for the current project
- Parse JSONL format (newline-delimited JSON)
- Return raw session data
- Handle missing files gracefully

**Implementation**:
```typescript
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

async export(sessionId: string): Promise<AgentExportResult> {
  try {
    const claudeDir = path.join(os.homedir(), ".claude", "projects");
    
    // Find project directory by matching current working directory
    const projects = await fs.readdir(claudeDir, { withFileTypes: true });
    let projectDir: string | null = null;
    
    for (const dirent of projects) {
      if (dirent.isDirectory()) {
        const projectPath = path.join(claudeDir, dirent.name);
        // Try to match by checking project config or path
        const configPath = path.join(projectPath, "project.json");
        try {
          const config = JSON.parse(await fs.readFile(configPath, "utf-8"));
          if (config.path === this.cwd) {
            projectDir = projectPath;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!projectDir) {
      return {
        exportData: null,
        success: false,
        error: "Project not found in Claude Code directory",
      };
    }

    // Find most recent chat_*.jsonl file
    const files = await fs.readdir(projectDir);
    const chatFiles = files.filter(f => f.startsWith("chat_") && f.endsWith(".jsonl"));
    
    if (chatFiles.length === 0) {
      return {
        exportData: null,
        success: false,
        error: "No chat files found",
      };
    }

    // Sort by modification time, get most recent
    const chatFileStats = await Promise.all(
      chatFiles.map(async f => ({
        name: f,
        stat: await fs.stat(path.join(projectDir, f)),
      }))
    );
    chatFileStats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    const latestFile = chatFileStats[0].name;

    // Read and parse JSONL
    const content = await fs.readFile(path.join(projectDir, latestFile), "utf-8");
    const exportData = content.split("\n")
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

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
```

### 6. Command Argument Building

**Private method** to construct CLI arguments:

```typescript
private buildCommandArgs(
  prompt: string,
  model: string,
  options?: AgentRunOptions,
  interactive: boolean = false
): string[] {
  const args: string[] = [];

  // Print mode flag (-p) - enables headless/non-interactive execution
  if (!interactive && this.headless) {
    args.push("-p");
  }

  // Model selection
  args.push("--model", model);

  // Prompt (passed as argument, no --prompt flag)
  // Quote if contains spaces
  args.push(`"${prompt.replace(/"/g, '\\"')}"`);

  // Additional agent-specific flags
  if (options?.agentFlags) {
    args.push(...options.agentFlags);
  }

  return args;
}
```

---

## Acceptance Criteria

- [ ] ClaudeCodeAdapter class created in `src/lib/agents/claude-code-adapter.ts`
- [ ] Implements all AgentAdapter interface methods
- [ ] Availability check works with Claude Code CLI
- [ ] Headless execution runs Claude Code with `-p` flag for print mode
- [ ] Interactive execution launches Claude Code TUI without `-p` flag
- [ ] Session ID returns null (Claude Code CLI doesn't output session IDs)
- [ ] Completion detection finds `<promise>COMPLETE</promise>` marker
- [ ] Export reads from JSONL files in `~/.claude/projects/*/chat_*.jsonl`
- [ ] Print mode flag `-p` is only used for headless runs
- [ ] All methods handle errors gracefully (no uncaught exceptions)
- [ ] Unit tests cover all methods with mocked file system and process execution
- [ ] Integration tests verify against actual Claude Code CLI (optional, gated)

---

## Technical Notes

### Design Decisions

1. **Print Mode (`-p` flag)**: The `-p` flag enables print/headless mode for non-interactive execution (outputs to stdout/stderr). Interactive mode omits this flag. The `headless` constructor parameter controls when to use `-p`.

2. **No Built-in Export**: Claude Code CLI doesn't have an `export` subcommand. Session data must be read from local JSONL files in `~/.claude/projects/*/chat_*.jsonl`.

3. **Session ID Not Available**: Claude Code CLI doesn't output session IDs in a predictable format. Return null for sessionId and track sessions by timestamp/chat file.

4. **Prompt as Argument**: Prompts are passed directly as arguments, not via `--prompt` flag.

5. **Prompt Escaping**: Quote prompts and escape internal quotes to prevent shell injection

6. **Completion Detection**: Search both stdout and stderr for `<promise>COMPLETE</promise>` marker (Claude Code may output to either)

7. **Version Storage**: Store version from availability check for metadata and debugging

### Claude Code CLI Research Completed

✅ **Verified**:
- [x] CLI command name: `claude`
- [x] Print mode flag: `-p` (for headless/non-interactive)
- [x] Headless mode: Use `-p` flag, no separate `--headless` flag
- [x] Interactive mode: No `-p` flag, just `claude --model <model> <prompt>`
- [x] Version flag: `--version` or `-v`
- [x] Model flag: `--model <model>` (e.g., `claude-sonnet-4-5-20250929`)
- [x] Session ID: Not output by CLI in predictable format, track via JSONL files
- [x] Export: No built-in export command, read from `~/.claude/projects/*/chat_*.jsonl`

### Error Cases

Handle these scenarios:
- Claude Code not installed: `checkAvailability()` returns false
- Invalid model name: Propagate Claude Code error in AgentRunResult
- Session file not found: Export returns success=false with error message
- Project directory not found: Export returns success=false with error message
- JSONL parse error: Export returns success=false with error message

### Testing Strategy

1. **Unit Tests** (with mocks):
    - Mock `runProcess` and `runProcessInteractive`
    - Mock file system operations for `export()`
    - Test completion detection
    - Test command argument building
    - Test export file finding and parsing

2. **Integration Tests** (gated):
    - Require `CLAUDE_CODE_INSTALLED=true` environment variable
    - Test actual Claude Code CLI if available
    - Test actual JSONL file reading if Claude Code is installed
    - Skip if not installed

---

## Dependencies

- **JTBD-102-SPEC-001**: AgentAdapter interface must exist
- `src/lib/process/runner.ts`: Process execution utilities
- Claude Code CLI must be installed for runtime use (not build-time)

## Impacts

- **JTBD-101-SPEC-001**: Agent selection logic will instantiate ClaudeCodeAdapter
- **JTBD-103-SPEC-001**: Print mode configuration depends on constructor parameter (headless flag)
- All command handlers will be updated to support ClaudeCodeAdapter via interface

---

## Implementation Checklist

- [x] Research Claude Code CLI commands and flags
- [ ] Create `src/lib/agents/claude-code-adapter.ts`
- [ ] Implement `checkAvailability()`
- [ ] Implement `run()` (no session ID extraction)
- [ ] Implement `runInteractive()`
- [ ] Implement `export()` (read from JSONL files)
- [ ] Implement `getMetadata()`
- [ ] Implement private helper methods
- [ ] Write unit tests (with file system mocks)
- [ ] Write integration tests (gated)
- [ ] Update documentation with Claude Code CLI requirements
