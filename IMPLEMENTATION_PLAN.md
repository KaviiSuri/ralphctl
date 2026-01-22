# Implementation Plan

## Overall Status

**Completed Specs:** 12/12 (JTBD-101-SPEC-001, JTBD-102-SPEC-001, JTBD-102-SPEC-002, JTBD-103-SPEC-001, JBTD-001 through JBTD-007) ✅
**Remaining Specs:** 0
**Current Tests:** 95 passing ✅
**Typecheck:** Passing ✅

---

## Dependency Chain Diagram

```
JTBD-102-SPEC-001 (Agent Adapter Interface - FOUNDATION) ✅ COMPLETE
        ↓
JTBD-102-SPEC-002 (ClaudeCodeAdapter Implementation) ✅ COMPLETE
        ↓
JTBD-101-SPEC-001 (Agent Selection via CLI/Env) ✅ COMPLETE
        ↓
JTBD-103-SPEC-001 (Claude Code Print Mode) ✅ COMPLETE
        ↓
JTBD-104-SPEC-001 (Agent-Aware Session Management) ✅ COMPLETE
```

---

## Remaining Tasks

### JTBD-104-SPEC-001: Agent-Aware Session Management [P0 - IN PROGRESS]

**Prerequisites:** JTBD-102-SPEC-001 complete ✅, JTBD-102-SPEC-002 complete ✅, JTBD-101-SPEC-001 complete ✅

**Purpose:** This spec addresses gaps in JBTD-005 (session state missing agent/printMode) and JBTD-006 (inspect routing hardcoded, missing fields). It enables mixed-agent session support and proper export routing while maintaining backward compatibility with existing session files.

#### P0: Domain Type Updates [COMPLETE]

- [x] P0: Add `agent: AgentType` field to SessionState interface in src/domain/types.ts:30-40
- [x] P0: Add `printMode?: boolean` field to SessionState interface in src/domain/types.ts:30-40
- [x] P0: Add `version?: string` field to SessionsFile interface in src/domain/types.ts:38-40
- [x] P0: Change InspectEntry.export type from `string` to `unknown | null` in src/domain/types.ts:42-47
- [x] P0: Add `agent: AgentType` field to InspectEntry interface in src/domain/types.ts:42-47
- [x] P0: Add `printMode?: boolean` field to InspectEntry interface in src/domain/types.ts:42-47
- [x] P0: Add `error?: string` field to InspectEntry interface in src/domain/types.ts:42-47

#### P0: Session State Management [COMPLETE]

- [x] P0: Implement lazy migration in readSessionsFile() in src/lib/state/index.ts:26-34
  - Check for `version` field in SessionsFile
  - If version missing, set default version = "1"
  - Set default `agent: "opencode"` for all sessions without agent field
  - Set `printMode: undefined` for all existing sessions (unknown historical state)
- [x] P0: Update writeSessionsFile() in src/lib/state/index.ts
  - Always include `version: "1"` field when writing
  - Include agent and printMode in each SessionState entry

#### P0: Run Handler Updates [COMPLETE]

- [x] P0: Update runHandler in src/lib/commands/run.ts:56-62 to capture agent in SessionState
  - Pass resolved agent type to SessionState constructor
  - Pass printMode value to SessionState constructor
- [x] P0: Update session creation after each iteration in src/lib/commands/run.ts
  - Set session.agent = resolved agent type
  - Set session.printMode = headless flag value

#### P0: Inspect Handler Updates [COMPLETE]

- [x] P0: Remove hardcoded OpenCodeAdapter import from inspectHandler in src/lib/commands/inspect.ts:1-11
- [x] P0: Add agent factory import to inspectHandler
- [x] P0: Route each session export based on session.agent field
  - Create agent instance via createAgent(session.agent)
  - Call agent.export(sessionId) for each session
- [x] P0: Handle agent unavailability gracefully
  - Catch agent factory errors (unavailable agents)
  - Log warning: "Skipping session {sessionId}: agent {agent} not available"
  - Set InspectEntry.error field with reason
  - Continue processing remaining sessions
- [x] P0: Populate InspectEntry fields
  - Set entry.agent = session.agent
  - Set entry.printMode = session.printMode
  - Set entry.export = result.exportData (or null on failure)
  - Set entry.error = error message on failure

#### P1: Error Handling Improvements

- [x] P1: Replace process.exit(1) with graceful degradation in inspectHandler
   - Log errors to console.error but continue processing
   - Include summary at end: "Exported {success}/{total} sessions"
   - List skipped/failed sessions in summary

#### P1: Tests

- [x] P1: Add tests for lazy migration in readSessionsFile
   - Test old session file without version field
   - Test agent defaulting to "opencode"
   - Test printMode defaulting to undefined
- [x] P1: Add tests for runHandler with agent/printMode capture
   - Verify SessionState includes agent and printMode fields
   - Test with different agent types and printMode values
- [x] P1: Add tests for inspectHandler agent routing
   - Test routing to correct adapter based on session.agent
   - Test graceful handling of unavailable agent
   - Test InspectEntry includes agent, printMode, error fields
- [x] P1: Test InspectEntry.export type is `unknown | null`

---

### P2 Gaps (Medium Priority)

#### JTBD-005-SPEC-002: Session Identification [P2]

- [ ] P2: Update ClaudeCodeAdapter to return null for sessionId in src/lib/agents/claude-code-adapter.ts
  - **Current:** Extracts sessionId from output
  - **Required:** Return null as per spec (session tracking is file-based, not CLI output-based)

#### JTBD-006-SPEC-002: Inspect Schema [P2]

- [x] P2: Ensure InspectEntry has error field in src/domain/types.ts:42-47
  - This is already tracked in JTBD-104-SPEC-001 P0 tasks

---

## Completed Specs (For Reference)

### JTBD-102-SPEC-001: Agent Adapter Interface ✅
- AgentAdapter interface with run, runInteractive, export, checkAvailability, getMetadata
- OpenCodeAdapter implements interface
- AgentType enum, AgentRunResult, AgentExportResult, AgentMetadata types

### JTBD-102-SPEC-002: ClaudeCodeAdapter Implementation ✅
- ClaudeCodeAdapter implements AgentAdapter interface
- Supports headless mode (-p flag) for print mode
- Prompt passed as direct argument (not --prompt flag)
- Export finds most recent chat file regardless of sessionId

### JTBD-101-SPEC-001: Agent Selection via CLI/Env ✅
- --agent CLI flag for run and step commands
- RALPHCTL_AGENT environment variable
- Priority: CLI flag > env var > default ("opencode")
- Factory signature uses CreateAgentOptions interface
- AgentUnavailableError class for unavailability errors

### JTBD-103-SPEC-001: Claude Code Print Mode ✅
- --no-print CLI flag to disable print mode
- Default print mode enabled for Claude Code (-p flag)
- OpenCodeAdapter silently ignores print mode setting
- Documented security implications in templates

### JBTD-001: CLI Command Surface ✅
- Four core commands: run, step, inspect, init
- Mode argument required for run/step (plan or build)
- Business logic decoupled from CLI library

### JBTD-002: Mode Contract, Prompt Defaults, Loop Termination, Model Defaults ✅
- Process runner for CLI execution
- Prompt resolution for step and run
- Loop termination with <promise>COMPLETE</promise> detection
- Max iterations default: 10
- DEFAULT_SMART_MODEL fixed to "openai/gpt-5.2-codex"

### JBTD-003: Permission Posture Handling ✅
- Permission posture handling and logging
- Mode-aware prompt arguments for step

### JBTD-004: Initialize Default Prompt Templates ✅
- Default PROMPT_plan.md and PROMPT_build.md templates
- init command with --force flag
- Confirmation prompts for existing files

### JBTD-005: Session Management and State Capture ✅
- Session tracking with iteration, sessionId, startedAt, mode, prompt
- Session file read/write utilities (.ralphctl/ralph-sessions.json)
- End iteration markers with session IDs

### JBTD-006: Inspect Artifact Generation ✅
- Basic export functionality for OpenCode
- InspectEntry interface with sessionId, iteration, startedAt, export
- Error handling for export failures

### JBTD-007: Step Command Model Override Completeness ✅
- ModelRole enum (Smart/Fast)
- ModelConfig interface with smart/fast models
- --smart-model and --fast-model CLI flags
- Model placeholder resolution ({smart}, {fast})

---

## Learnings

- Agent selection priority: CLI flag > env var > default
- Claude Code print mode (`-p` / `--print`) enables headless execution and skips trust dialog
- Print mode is enabled by default for Claude Code for faster automation
- `--no-print` flag allows disabling print mode for interactive debugging
- Print mode is Claude Code specific - OpenCode ignores it silently
- Print mode status is only logged when using Claude Code
- Agent metadata includes version, availability, and type
- Session migration defaults old sessions to OpenCode agent
- Inspect handler routes exports based on session.agent field
- Agent factory performs eager availability check and provides clear error messages
- Lazy migration allows reading old session files without breaking changes
- Graceful degradation in inspectHandler ensures partial exports succeed
- InspectEntry.error field enables debugging export failures
- Both OpenCode and ClaudeCode adapters implement AgentAdapter interface fully
- Session ID extraction uses multiple regex patterns for robustness across CLI versions
- Completion detection uses `<promise>COMPLETE</promise>` marker consistently across both agents
- Model placeholder resolution supports `{smart}` and `{fast}` replacements in prompts
- Model defaults: smart="openai/gpt-5.2-codex", fast="zai-coding-plan/glm-4.7"
- InspectEntry.export type should be `unknown | null` to preserve native formats
- ClaudeCodeAdapter passes prompt as CLI argument, not as --prompt flag (FIXED)
- ClaudeCodeAdapter export finds most recent chat file, not filtered by sessionId (FIXED)
- AgentUnavailableError class needed for factory error handling (FIXED)
- End iteration markers already present in run.ts (--- Iteration N/M ---)
- JTBD-104-SPEC-001 P1 tasks completed (error handling, test coverage)
