# JTBD-102-SPEC-001: Agent Adapter Interface

**Parent JTBD**: JTBD-102 - Adapt Agent-Specific Execution Patterns
**Status**: Not Started
**Priority**: P0 (Foundation)

---

## Purpose

Define a common TypeScript interface that abstracts agent-specific execution details, enabling rctl to work uniformly with OpenCode, Claude Code, and potentially future agents without changing command handlers.

## Scope

**In Scope**:
- TypeScript interface definition for agent operations
- Core operations: availability check, headless run, interactive run, session export
- Error handling contracts
- Session ID extraction patterns
- Environment configuration

**Out of Scope**:
- Agent discovery or auto-detection
- Agent-specific feature negotiation
- Unified export format (preserve native formats)
- Agent performance monitoring

---

## Behavioral Requirements

### 1. Interface Definition

Create `src/domain/agent.ts` with the following interface:

```typescript
export interface AgentAdapter {
  /**
   * Check if the agent CLI is available and functioning
   * @returns Promise<boolean> true if available, false otherwise
   * @throws Never throws, returns false on unavailability
   */
  checkAvailability(): Promise<boolean>;

  /**
   * Execute agent in headless mode with a prompt
   * @param prompt The instruction prompt for the agent
   * @param model The model to use (agent-specific format)
   * @param options Additional execution options
   * @returns Promise<AgentRunResult>
   */
  run(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<AgentRunResult>;

  /**
   * Execute agent in interactive TUI mode
   * @param prompt The instruction prompt for the agent
   * @param model The model to use
   * @param options Additional execution options
   * @returns Promise<void>
   */
  runInteractive(
    prompt: string,
    model: string,
    options?: AgentRunOptions
  ): Promise<void>;

  /**
   * Export session data for inspection
   * @param sessionId The session ID to export
   * @returns Promise<AgentExportResult>
   */
  export(sessionId: string): Promise<AgentExportResult>;

  /**
   * Get agent metadata
   * @returns AgentMetadata
   */
  getMetadata(): AgentMetadata;
}

export interface AgentRunOptions {
  /** Permission posture for file operations */
  permissionPosture?: PermissionPosture;
  /** Working directory for execution */
  cwd?: string;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Agent-specific flags (e.g., --agent build for OpenCode, -p for Claude Code) */
  agentFlags?: string[];
}

export interface AgentRunResult {
  /** Raw stdout from agent execution */
  stdout: string;
  /** Raw stderr from agent execution */
  stderr: string;
  /** Extracted session ID (null if not found) */
  sessionId: string | null;
  /** Whether completion promise was detected */
  completionDetected: boolean;
  /** Exit code */
  exitCode: number;
}

export interface AgentExportResult {
  /** Native export data from agent (unparsed) */
  exportData: unknown;
  /** Whether export succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export interface AgentMetadata {
  /** Agent identifier (e.g., "opencode", "claude-code") */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Agent version (if available) */
  version?: string;
  /** CLI command name */
  cliCommand: string;
}

export enum AgentType {
  OpenCode = "opencode",
  ClaudeCode = "claude-code",
}
```

### 2. Session ID Extraction

Each adapter implementation must:
- Define regex patterns for extracting session IDs from agent output
- Handle multiple output formats (JSON, plain text, etc.)
- Return `null` if no session ID is found (graceful degradation)
- Log extraction attempts for debugging

### 3. Completion Detection

Each adapter must:
- Scan output for completion markers (e.g., `<promise>COMPLETE</promise>`)
- Support agent-specific completion signals if different
- Set `completionDetected: true` in result when found
- Default to `false` if no marker is present

### 4. Error Handling

All adapter methods must:
- Never throw exceptions for operational failures (unavailability, command failures)
- Use return values to indicate success/failure
- Only throw for programming errors (invalid parameters)
- Provide actionable error messages in results

---

## Acceptance Criteria

- [ ] `AgentAdapter` interface defined in `src/domain/agent.ts`
- [ ] All supporting types defined (AgentRunOptions, AgentRunResult, etc.)
- [ ] Interface includes comprehensive JSDoc comments
- [ ] AgentType enum includes OpenCode and ClaudeCode
- [ ] No implementation details leak into interface (pure abstraction)
- [ ] Interface can accommodate future agents without changes
- [ ] Unit tests validate interface shape (compile-time checks)

---

## Technical Notes

### Design Decisions

1. **Async by Default**: All methods return Promises to accommodate potential async operations (version checks, network calls in future)

2. **No Inheritance**: Use composition over inheritance - adapters implement interface rather than extending base class

3. **Agent-Specific Flags**: `agentFlags` array allows each adapter to pass custom flags without polluting shared interface

4. **Native Export Format**: Preserve agent-specific export formats rather than forcing normalization (aligns with JTBD-005)

### Migration Path

Existing `OpenCodeAdapter` at `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/opencode/adapter.ts` will be refactored to:
1. Implement `AgentAdapter` interface
2. Move to `src/lib/agents/opencode-adapter.ts`
3. Maintain backward compatibility in method signatures
4. Wrap existing logic in new interface methods

### Future Extensibility

This interface is designed to support:
- Remote agents (HTTP APIs)
- Agent plugins
- Custom agent wrappers
- Agent capability negotiation (via metadata)

---

## Dependencies

- None (foundation spec)

## Impacts

- **JTBD-102-SPEC-002**: ClaudeCodeAdapter implementation depends on this interface
- **JTBD-101-SPEC-001**: Agent selection depends on this abstraction
- All command handlers will be updated to use `AgentAdapter` instead of `OpenCodeAdapter`

---

## Implementation Checklist

- [ ] Create `src/domain/agent.ts`
- [ ] Define `AgentAdapter` interface
- [ ] Define supporting types and enums
- [ ] Add JSDoc comments
- [ ] Create unit test stubs
- [ ] Update `src/domain/types.ts` to export AgentType
- [ ] Document design decisions in code comments
