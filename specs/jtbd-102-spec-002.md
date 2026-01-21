# JTBD-102-SPEC-002: ClaudeCodeAdapter Implementation

**Parent JTBD**: JTBD-102 - Adapt Agent-Specific Execution Patterns
**Status**: Not Started
**Priority**: P0 (Core Feature)
**Depends On**: JTBD-102-SPEC-001

---

## Purpose

Implement the `AgentAdapter` interface for Claude Code CLI, enabling rctl to execute Claude Code in both headless and interactive modes with proper session management and project mode support.

## Scope

**In Scope**:
- ClaudeCodeAdapter class implementing AgentAdapter interface
- Claude Code CLI command construction
- Session ID extraction from Claude Code output
- Project mode (`-p`) flag handling
- Claude Code-specific environment configuration

**Out of Scope**:
- Claude API direct integration (CLI only)
- Custom Claude Code features beyond what CLI provides
- Model capability detection
- Claude Code installation or configuration

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
    private readonly useProjectMode: boolean = true
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
claude -p --model <model> --prompt <prompt>
```

**Flags**:
- `-p`: Project mode (enabled by default, controlled by constructor param)
- `--model`: Model selection (e.g., "claude-sonnet-4-5")
- `--prompt`: Instruction prompt (passed as argument or via heredoc)
- `--headless`: Force non-interactive mode (if available)

**Session ID Extraction**:
- Pattern 1: `Session ID: <id>` (plain text)
- Pattern 2: `"sessionId":"<id>"` (JSON output)
- Pattern 3: `[Session: <id>]` (bracketed format)
- Return null if no match

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
    sessionId: this.extractSessionId(combinedOutput),
    completionDetected: this.detectCompletion(combinedOutput),
    exitCode: result.exitCode,
  };
}
```

### 4. Interactive Execution (runInteractive)

**Command Construction**:
```
claude -p --model <model> --prompt <prompt>
```

**Behavior**:
- Same flags as headless mode
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

**Command**: `claude export <sessionId>`

**Behavior**:
- Execute export command with session ID
- Capture JSON output
- Parse JSON if possible (optional)
- Return raw export data
- Handle missing sessions gracefully

**Implementation**:
```typescript
async export(sessionId: string): Promise<AgentExportResult> {
  try {
    const result = await runProcess(`claude export ${sessionId}`, {
      cwd: this.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    if (result.exitCode === 0) {
      let exportData: unknown;
      try {
        exportData = JSON.parse(result.stdout);
      } catch {
        exportData = result.stdout; // Fallback to raw string
      }

      return {
        exportData,
        success: true,
      };
    }

    return {
      exportData: null,
      success: false,
      error: result.stderr || "Export failed",
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

  // Project mode flag
  if (this.useProjectMode) {
    args.push("-p");
  }

  // Model selection
  args.push("--model", model);

  // Prompt (quote if contains spaces)
  args.push("--prompt", `"${prompt.replace(/"/g, '\\"')}"`);

  // Additional agent-specific flags
  if (options?.agentFlags) {
    args.push(...options.agentFlags);
  }

  // Headless mode if not interactive
  if (!interactive) {
    args.push("--headless"); // If Claude Code supports this flag
  }

  return args;
}
```

---

## Acceptance Criteria

- [ ] ClaudeCodeAdapter class created in `src/lib/agents/claude-code-adapter.ts`
- [ ] Implements all AgentAdapter interface methods
- [ ] Availability check works with Claude Code CLI
- [ ] Headless execution runs Claude Code in non-interactive mode
- [ ] Interactive execution launches Claude Code TUI
- [ ] Session ID extraction works with Claude Code output formats
- [ ] Completion detection finds `<promise>COMPLETE</promise>` marker
- [ ] Export command retrieves session data
- [ ] Project mode flag `-p` is included when enabled
- [ ] All methods handle errors gracefully (no uncaught exceptions)
- [ ] Unit tests cover all methods with mocked process execution
- [ ] Integration tests verify against actual Claude Code CLI (optional, gated)

---

## Technical Notes

### Design Decisions

1. **Project Mode Constructor Param**: Enable/disable via constructor rather than per-call to maintain consistency across a session

2. **Prompt Escaping**: Quote prompts and escape internal quotes to prevent shell injection

3. **Combined Output Search**: Search both stdout and stderr for session IDs and completion markers (Claude Code may output to either)

4. **Version Storage**: Store version from availability check for metadata and debugging

### Claude Code CLI Research Needed

Before implementation, research/verify:
- [ ] Exact CLI command name (`claude` vs `claude-code`)
- [ ] Project mode flag (`-p` vs `--project`)
- [ ] Headless mode support (flag name or alternative approach)
- [ ] Session ID output format
- [ ] Export command syntax
- [ ] Model name format (e.g., "claude-sonnet-4-5" vs "sonnet-4-5")

**NOTE**: If Claude Code CLI differs from assumptions, update this spec accordingly.

### Error Cases

Handle these scenarios:
- Claude Code not installed: `checkAvailability()` returns false
- Invalid model name: Propagate Claude Code error in AgentRunResult
- Session ID not found: Return null, log warning
- Export command fails: Return success=false with error message

### Testing Strategy

1. **Unit Tests** (with mocks):
   - Mock `runProcess` and `runProcessInteractive`
   - Test session ID extraction with various formats
   - Test completion detection
   - Test command argument building

2. **Integration Tests** (gated):
   - Require `CLAUDE_CODE_INSTALLED=true` environment variable
   - Test actual Claude Code CLI if available
   - Skip if not installed

---

## Dependencies

- **JTBD-102-SPEC-001**: AgentAdapter interface must exist
- `src/lib/process/runner.ts`: Process execution utilities
- Claude Code CLI must be installed for runtime use (not build-time)

## Impacts

- **JTBD-101-SPEC-001**: Agent selection logic will instantiate ClaudeCodeAdapter
- **JTBD-103-SPEC-001**: Project mode configuration depends on constructor parameter
- All command handlers will be updated to support ClaudeCodeAdapter via interface

---

## Implementation Checklist

- [ ] Research Claude Code CLI commands and flags
- [ ] Create `src/lib/agents/claude-code-adapter.ts`
- [ ] Implement `checkAvailability()`
- [ ] Implement `run()` with session ID extraction
- [ ] Implement `runInteractive()`
- [ ] Implement `export()`
- [ ] Implement `getMetadata()`
- [ ] Implement private helper methods
- [ ] Write unit tests
- [ ] Write integration tests (gated)
- [ ] Update documentation with Claude Code CLI requirements
