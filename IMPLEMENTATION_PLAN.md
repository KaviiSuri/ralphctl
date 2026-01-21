# Implementation Plan

## Dependency Chain Diagram

```
JTBD-102-SPEC-001 (Agent Adapter Interface - FOUNDATION) ✅ COMPLETE
        ↓
JTBD-102-SPEC-002 (ClaudeCodeAdapter Implementation) [NEXT]
        ↓
JTBD-101-SPEC-001 (Agent Selection via CLI/Env)
        ↓
JTBD-103-SPEC-001 (Claude Code Project Mode)
        ↓
JTBD-104-SPEC-001 (Agent-Aware Session Management)
```

---

## JBTD-001: CLI Command Surface [COMPLETED]

- [x] P0: Research and select a good zod-based typesafe CLI library (e.g., `clerc`, `zod-cli`, or similar) that integrates well with Bun/TypeScript
- [x] P0: Add Bun + TypeScript setup (`package.json`, `bunfig.toml`, `tsconfig.json`) and ensure `bun run typecheck` is available
- [x] P0: Scaffold baseline project layout with `src/`, `src/lib/` (standard library), `src/domain/` (business logic), and CLI entrypoint (`src/cli.ts`)
- [x] P0: Define domain models in `src/domain/` for CLI commands and modes (Command enum: `run`, `step`, `inspect`, `init`; Mode enum: `plan`, `build`)
- [x] P0: Configure the chosen CLI library to expose exactly four core commands: `run`, `step`, `inspect`, `init`
- [x] P0: Configure `run` and `step` to require positional mode argument (`plan` or `build`), keeping parsing logic in library layer and validation in domain layer
- [x] P0: Configure `inspect` and `init` to not require a mode argument
- [x] P0: Implement help/usage output so `ralphctl --help` and `rctl --help` list only the four core commands with mode guidance
- [x] P1: Add clear error messaging for invalid/missing mode arguments, including usage guidance (domain layer validation)
- [x] P1: Wire command handler registry (stubs) in `src/lib/commands/*` with no extra commands beyond the core set
- [x] P1: Ensure business logic is decoupled from CLI library - main file (`src/cli.ts`) should use domain types, not library-specific types
- [x] P2: Add brief CLI usage reference in existing docs (optional) once help text is finalized

---

## JBTD-002: Mode Contract, Prompt Defaults, Loop Termination, Model Defaults [COMPLETED]

- [x] P0: Create shared process runner under `src/lib/process/` (Bun.spawn-based) for CLI execution with consistent stdout/stderr capture
- [x] P0: Create a shared OpenCode CLI adapter under `src/lib/opencode/` that uses the process runner and never the SDK
- [x] P0: Add `opencode --version` availability check for `run` and `step` (fail early if unavailable)
- [x] P0: Wire `run` handler to invoke `opencode run` via the adapter (still stub logic, but CLI-based)
- [x] P0: Wire `step` handler to invoke `opencode --prompt` via the adapter (CLI-based)
- [x] P1: Add `inspect` handler implementation that uses `opencode export` through the adapter (session IDs can be stubbed for now)
- [x] P1: Add tests to assert handlers call the OpenCode CLI adapter (mocked process runner)
- [x] P0: Implement prompt resolution for `step` and add mode-aware logging to match `run` (jbtd-002-spec-002, jbtd-002-spec-001)
- [x] P0: Define and enforce loop termination behavior in `run` per jbtd-002-spec-003
  - Added `maxIterations` parameter (default: 10)
  - Implemented loop with `<promise>COMPLETE</promise>` detection
  - Added iteration markers showing progress
  - Graceful handling of max iterations and manual interruption
  - Tests for completion, max iterations, and multiple iterations

---

## JBTD-003: Permission Posture Handling [COMPLETED]

- [x] P0: Implement `step` prompt overrides per jbtd-007-spec-001/002 (mode-aware prompt arguments)
   - ✅ COMPLETED: Model overrides fully implemented for both run and step
   - See JBTD-007 section below for implementation details
- [x] P1: Add permissions posture handling and log effective posture before first iteration (jbtd-003-spec-001/002)
- [x] P2: Validate command expectations and `rctl` alias behaviors against jbtd-001-spec-001/003

---

## JBTD-004: Initialize Default Prompt Templates [COMPLETED]

- [x] P0: Create shared template constants in src/lib/templates/ for PROMPT_plan.md and PROMPT_build.md content (verbatim from jbtd-002-spec-002)
- [x] P0: Create shared file utility under `src/lib/files/` for safe file operations (writeFile, fileExists)
- [x] P0: Create shared user interaction utility under `src/lib/io/` for confirmation prompts (confirmOverwrite with y/N)
- [x] P0: Add `--force` flag to `init` command in CLI configuration (src/cli.ts:75-78)
- [x] P0: Implement `initHandler` in src/lib/commands/init.ts with full logic:
  - Use template constants from src/lib/templates/
  - Write PROMPT_plan.md using PLAN_TEMPLATE constant
  - Write PROMPT_build.md using BUILD_TEMPLATE constant
  - Check if files exist before writing
  - Prompt with y/N confirmation when files exist (unless --force)
  - Handle confirmation response (abort on non-y input)
- [x] P1: Add comprehensive tests for initHandler in tests/handlers.spec.ts:
  - Test writing both files to new directory (files created with correct content)
  - Test prompting for confirmation when files exist (mock user input)
  - Test --force flag bypassing confirmation (overwrites existing files)
  - Test user declining confirmation (no files written, clean abort)
  - Test idempotent behavior when files not overwritten (existing content preserved)
  - Test partial write failure handling (atomic writes, no corruption)
- [x] P1: Test edge cases for file utilities:
  - Permission denied errors (handled gracefully with error message)
  - File system errors during write (rollback behavior)
  - Concurrent writes (last write wins, but atomic per file)
- [x] P2: Add domain type for InitOptions (force flag) in src/domain/types.ts

---

## JBTD-005: Session Management and State Capture [COMPLETED]

- [x] P0: Add session tracking infrastructure to domain types
  - [x] P0: Add `SessionState` interface to src/domain/types.ts with fields: iteration, sessionId, startedAt, mode, prompt
  - [x] P0: Add `SessionsFile` interface for .ralphctl/ralph-sessions.json structure with sessions array and metadata
  - [x] P0: Add `sessionId` field to `OpenCodeRunResult` interface in src/lib/opencode/adapter.ts

- [x] P0: Extract session IDs from OpenCode CLI output
  - [x] P0: Implement session ID extraction logic in src/lib/opencode/adapter.ts:run() method
  - [x] P0: Parse OpenCode CLI output for session ID (investigate output format, likely in headers or structured metadata)
  - [x] P0: Set sessionId field on returned OpenCodeRunResult object
  - [x] P0: Make extraction resilient to output format variations (use multiple regex patterns if needed)

- [x] P0: Create session state persistence utilities
  - [x] P0: Create `ensureRalphctlDir()` utility to ensure .ralphctl directory exists
  - [x] P0: Create `writeSessionsFile(sessions: SessionState[])` utility in src/lib/state/index.ts
  - [x] P0: Create `readSessionsFile()` utility to read existing session data
  - [x] P0: Use writeFile from src/lib/files/index.ts for atomic writes

- [x] P0: Integrate state capture into iteration loop
  - [x] P0: Create SessionState object after each iteration in src/lib/commands/run.ts
  - [x] P0: Include iteration number, sessionId, startedAt timestamp, mode, and prompt
  - [x] P0: Append new session to existing sessions array
  - [x] P0: Write to .ralphctl/ralph-sessions.json after each iteration completes
  - [x] P0: Handle file read/write errors gracefully with clear error messages

- [x] P0: Add end iteration markers with session IDs
  - [x] P0: Add end marker after each iteration in src/lib/commands/run.ts iteration loop
  - [x] P0: End marker format: `--- Iteration X/Y Complete (Session: {sessionId}) ---`
  - [x] P0: Ensure end marker appears after OpenCode run completes but before state capture

- [x] P1: Update start markers to include session IDs
  - [x] P1: Update existing start marker in src/lib/commands/run.ts:39 to include session ID
  - [x] P1: Format: `--- Iteration X/Y (Session: {sessionId}) ---`
  - [x] P1: Ensure session ID is available before start marker (extract after OpenCode starts, or get from previous run for first iteration)

- [x] P1: Add tests for session tracking
  - [x] P1: Test session ID extraction in adapter.ts with various output formats
  - [x] P1: Test session file writing utility (create, append, read)
  - [x] P1: Test iteration markers include session IDs
  - [x] P1: Test .ralphctl directory creation
  - [x] P1: Test state capture integration in run loop
  - [x] P1: Test file format is valid JSON and readable by tooling

- [x] P2: Verify session isolation
  - [x] P2: Add validation that each iteration uses unique session ID
  - [x] P2: Log session ID mapping for debugging purposes
  - [x] P2: Add test to verify no --continue or --session flags are passed implicitly

- [x] P2: Update inspect handler integration
   - [x] P2: Replace hardcoded sessionId placeholder in src/lib/commands/inspect.ts with session reading logic
   - [x] P2: Read from .ralphctl/ralph-sessions.json to get session history
   - [x] P0: Export session data matching JBTD-006 specs (see JBTD-006 section below)

---

## JBTD-006: Inspect Artifact Generation [COMPLETED]

### Existing Infrastructure
- `OpenCodeAdapter.export()` already returns raw stdout from `opencode export` (✅ satisfies jbtd-006-spec-001)
- `readSessionsFile()` returns SessionState[] ordered by iteration
- `writeFile()` utility available via `src/lib/files/index.ts`
- SessionState interface has iteration, sessionId, startedAt, mode, prompt fields

### P0: Core Inspect Functionality

- [x] P0: Add InspectEntry interface to src/domain/types.ts for output schema
  - [x] P0: Define fields: sessionId, iteration, startedAt, export (required per jbtd-006-spec-003)
  - [x] P0: Export field type: string (raw JSON from opencode export command)

- [x] P0: Implement core inspect logic in src/lib/commands/inspect.ts
  - [x] P0: Import readSessionsFile from src/lib/state/index.ts
  - [x] P0: Import writeFile from src/lib/files/index.ts
  - [x] P0: Read all sessions from `.ralphctl/ralph-sessions.json`
  - [x] P0: Loop through sessions array (already ordered by iteration)
  - [x] P0: For each session, call adapter.export(sessionId) via existing OpenCodeAdapter
  - [x] P0: Build InspectEntry object: { sessionId, iteration, startedAt, export: result.output }
  - [x] P0: Validate required fields (jbtd-006-spec-003) - error if any missing
  - [x] P0: Write output array to JSON file (see output file decision below)

- [x] P0: Determine output file naming and location
  - [x] P0: File must be valid JSON readable by jq (jbtd-006-spec-002)
  - [x] P0: Consider options: `inspect.json`, `.ralphctl/inspect.json`, or timestamped `inspect-<timestamp>.json`
  - [x] P0: Use JSON.stringify(..., null, 2) for consistency with sessions file

- [x] P0: Remove TODO comment from inspect.ts:6 after implementation

### P1: Error Handling and Edge Cases

- [x] P1: Handle export failures for individual sessions
  - [x] P1: When adapter.export() returns success=false, skip session with warning
  - [x] P1: Log skipped session info (sessionId, iteration) to console.error
  - [x] P1: Continue processing remaining sessions instead of aborting entire inspect

- [x] P1: Handle empty sessions array
  - [x] P1: When readSessionsFile() returns [], output empty JSON array `[]`
  - [x] P1: Log informational message: "No sessions found in .ralphctl/ralph-sessions.json"

- [x] P1: Handle file write errors
  - [x] P1: Catch writeFile() errors and report to console.error
  - [x] P1: Use process.exit(1) on write failure for consistency with other handlers
  - [x] P1: Include error message from writeFile error in output

- [x] P1: Validate session data integrity
  - [x] P1: Check for null/undefined required fields before creating InspectEntry
  - [x] P1: Skip corrupted session entries with warning log
  - [x] P1: Validate iteration field is a number
  - [x] P1: Validate sessionId is a non-empty string

- [x] P1: Add progress reporting
  - [x] P1: Log "Exporting session {sessionId} (iteration {iteration}/{total})" before each export
  - [x] P1: Log final message: "Exported {count} session(s) to {filename}"

### P2: Enhancements and Testing

- [x] P2: Add comprehensive tests for inspectHandler in tests/handlers.spec.ts
  - [x] P2: Test basic flow: read sessions, export all, write JSON file
  - [x] P2: Test empty sessions array outputs `[]`
  - [x] P2: Test export failure skips session and continues
  - [x] P2: Test missing required fields cause validation error
  - [x] P2: Test output file format is valid JSON
  - [x] P2: Test array length matches session count (jbtd-006-spec-002)
  - [x] P2: Test export field contains raw output from adapter

- [x] P2: Add output file path parameter
   - [x] P2: Allow user to specify output file via CLI flag: `--output inspect.json`
   - [x] P2: Default to `inspect.json` in current working directory
   - [x] P2: Add InspectOptions interface to domain types
   - [x] P2: Update inspectHandler to accept options parameter
   - [x] P2: Add --output flag to inspect command in CLI
   - [x] P2: Add tests for default and custom output paths
   - [x] P2: All tests passing (58 total)

---

## JBTD-007: Step Command Model Override Completeness [COMPLETED]

### Status Overview
- jbtd-007-spec-001 (Interactive Step with TUI): ✅ Complete
- jbtd-007-spec-002 (Shared Args - model overrides): ✅ Complete
- jbtd-002-spec-004 (Model Defaults): ✅ Complete

### Implementation Summary

**P0: Domain Model and Types**
- ✅ Added ModelRole enum to src/domain/types.ts (Smart = "smart", Fast = "fast")
- ✅ Added ModelConfig interface to src/domain/types.ts (smart: string, fast: string)
- ✅ Added default model constants to src/domain/types.ts
  - DEFAULT_SMART_MODEL = "openai/gpt-5.2-codex"
  - DEFAULT_FAST_MODEL = "zai-coding-plan/glm-4.7"
- ✅ Created createModelConfig utility function to merge overrides with defaults
- ✅ Extended RunHandlerOptions and StepHandlerOptions with smartModel and fastModel fields

**P0: CLI Flags for Model Overrides**
- ✅ Added --smart-model flag to run command (src/cli.ts)
- ✅ Added --fast-model flag to run command (src/cli.ts)
- ✅ Added --smart-model flag to step command (src/cli.ts)
- ✅ Added --fast-model flag to step command (src/cli.ts)
- ✅ Passed model flags from CLI to runHandler and stepHandler

**P0: Model Placeholder Resolution**
- ✅ Created model placeholder resolver in src/lib/models/resolver.ts
  - Exported ResolveModelOptions interface
  - Exported resolveModelPlaceholders function
  - Uses global replace for {smart} and {fast} placeholders
- ✅ Integrated model resolver into run command
  - Calls resolveModelPlaceholders after resolvePrompt
  - Passes resolved prompt to adapter.run()
- ✅ Integrated model resolver into step command
  - Calls resolveModelPlaceholders after resolvePrompt
  - Passes resolved prompt to adapter.runWithPromptInteractive()

**P0: OpenCodeAdapter Model Support**
- ✅ Updated run() signature to accept optional model parameter
- ✅ Updated runWithPromptInteractive() signature to accept optional model parameter
- ✅ Conditional command building to pass --model flag to OpenCode CLI when provided
- ✅ Both methods respect model parameter or omit it when undefined

**P1: Test Coverage for Step Command**
- ✅ Added tests for customPrompt in stepHandler
- ✅ Added tests for permissionPosture variations
- ✅ Added tests for model override flags (--smart-model, --fast-model)
- ✅ Added tests for model placeholder resolution ({smart}, {fast} replacements)
- ✅ Added tests for runWithPromptInteractive failure handling

**P1: Test Coverage for Run Command Model Overrides**
- ✅ Added tests for model override flags in run
- ✅ Added tests for model placeholder resolution in run loop
- ✅ All tests passing

### Cross-Spec Dependencies
- jbtd-002-spec-004 defines model defaults: ✅ Complete
- jbtd-007-spec-001 (TUI with --prompt): ✅ Complete
- jbtd-007-spec-002 (mode-aware args, model overrides): ✅ Complete
- JBTD-007-spec-002 "model overrides applied consistently with run": ✅ Complete (both run and step have identical model support)

### Key Implementation Details
- Model overrides work identically in both run and step commands
- Model placeholders in prompts are resolved before passing to OpenCode CLI
- Default models are used when no override is provided
- OpenCodeAdapter passes --model flag to CLI only when model is specified
- All tests cover success and failure scenarios

---

### P0: Output File Decision (COMPLETED)

Spec does not specify output file name/location. Options:
1. `inspect.json` in CWD - simple, discoverable ✓ CHOSEN
2. `.ralphctl/inspect.json` - keeps artifacts internal, cleaner CWD
3. `inspect-<timestamp>.json` - preserves history, but clutter

**Decision:** Use `inspect.json` in CWD for discoverability, similar to how `PROMPT_*.md` files are in CWD.

---

## JTBD Series: Agent Support

### Dependency Chain
```
JTBD-102-SPEC-001 (Agent Adapter Interface - FOUNDATION)
        ↓
JTBD-102-SPEC-002 (ClaudeCodeAdapter Implementation)
        ↓
JTBD-101-SPEC-001 (Agent Selection via CLI/Env)
        ↓
JTBD-103-SPEC-001 (Claude Code Project Mode)
        ↓
JTBD-104-SPEC-001 (Agent-Aware Session Management)
```

---

## JTBD-102-SPEC-001: Agent Adapter Interface [P0 - FOUNDATION] ✅ COMPLETED

**CRITICAL: This is the FOUNDATION for all other JTBD specs. Must implement first.**

- [x] P0: Create `src/domain/agent.ts` with AgentAdapter interface
  - [x] P0: Define `AgentType` enum with values "opencode" and "claude-code"
  - [x] P0: Define `AgentRunOptions` interface (prompt, model, maxIterations, permissionPosture)
  - [x] P0: Define `AgentRunResult` interface (stdout, stderr, sessionId, completionDetected, exitCode)
  - [x] P0: Define `AgentExportResult` interface (exportData, success, error)
  - [x] P0: Define `AgentMetadata` interface (name, displayName, version, cliCommand)
  - [x] P0: Define `AgentAdapter` interface with methods:
    - `checkAvailability(): Promise<boolean>`
    - `run(prompt: string, model: string, options?: AgentRunOptions): Promise<AgentRunResult>`
    - `runInteractive(prompt: string, model: string, options?: AgentRunOptions): Promise<void>`
    - `export(sessionId: string): Promise<AgentExportResult>`
    - `getMetadata(): AgentMetadata`

- [x] P0: Update OpenCodeAdapter to implement AgentAdapter interface
  - [x] P0: Rename/move existing OpenCode adapter to conform to interface
  - [x] P0: Implement all interface methods (run, runInteractive, export, getMetadata, checkAvailability)
  - [x] P0: Add `getMetadata()` method to OpenCodeAdapter that returns:
    - name: "opencode"
    - displayName: "OpenCode"
    - version: from cached `opencode --version`
    - cliCommand: "opencode"
  - [x] P0: Add `detectCompletion()` helper method for `<promise>COMPLETE</promise>` detection

- [x] P0: Create type exports in src/domain/index.ts
  - [x] P0: Export all agent types and interfaces
  - [x] P0: Export AgentAdapter interface
  - [x] P0: Export AgentType enum and PermissionPosture type

- [x] P0: Update command handlers to use new interface
  - [x] Updated runHandler to use AgentAdapter interface methods
  - [x] Updated stepHandler to use runInteractive instead of runWithPromptInteractive
  - [x] Updated inspectHandler to use exportData instead of output field
  - [x] Updated all tests to mock new AgentAdapter interface signatures

### Implementation Notes
- Interface design should be generic enough to support both OpenCode and Claude Code
- OpenCodeAdapter now implements AgentAdapter interface at src/lib/opencode/adapter.ts
- AgentRunResult differs from old OpenCodeRunResult: uses `stdout/stderr` instead of `output`, includes `completionDetected` and `exitCode` fields
- AgentAdapter.checkAvailability() returns boolean directly instead of wrapping in result object
- AgentExportResult uses `exportData` instead of `output` field
- AgentAdapter.runInteractive() returns void instead of result object
- All existing tests updated to match new interface signatures

### Learnings
- AgentAdapter interface abstracts CLI-specific implementation details
- checkAvailability() returns boolean directly for simpler API
- completionDetected field simplifies completion detection logic
- Tests require updating when interface changes are made
- Type exports in domain/index.ts simplify imports for consuming code

---

## JTBD-102-SPEC-002: ClaudeCodeAdapter Implementation [P0 - DEPENDS ON JTBD-102-SPEC-001]

**Prerequisite: JTBD-102-SPEC-001 must be completed first.**

- [ ] P0: Create `src/lib/agents/` directory structure
  - [ ] P0: Create `src/lib/agents/claude-code-adapter.ts`
  - [ ] P0: Create `src/lib/agents/index.ts` for exports

- [ ] P0: Implement ClaudeCodeAdapter class implementing AgentAdapter interface
  - [ ] P0: Constructor accepts `useProjectMode: boolean` parameter (defaults to true)
  - [ ] P0: Implement `checkAvailability(): Promise<boolean>`
    - Run `claude --version` and check exit code
    - Return true if command succeeds, false otherwise

  - [ ] P0: Implement `run(options: AgentRunOptions): Promise<AgentRunResult>`
    - Build `claude` command with appropriate flags
    - Pass `--prompt` with prompt content
    - Pass `--model` if model option provided
    - Handle `<promise>COMPLETE</promise>` completion detection
    - Extract session ID from output (support 3 patterns below)
    - Return AgentRunResult with success, sessionId, output, error

  - [ ] P0: Implement `runInteractive(prompt: string, options?: Partial<AgentRunOptions>): Promise<AgentRunResult>`
    - Interactive mode using `claude` command
    - Pass prompt via stdin or --prompt flag
    - Support same model and other options as run()

  - [ ] P0: Implement `export(sessionId: string): Promise<AgentExportResult>`
    - Run `claude export --session <sessionId>` or equivalent
    - Return raw output in AgentExportResult

  - [ ] P0: Implement `getMetadata(): Promise<AgentMetadata>`
    - Return AgentMetadata with agentType: "claude-code"
    - version: from `claude --version`
    - available: from checkAvailability()

- [ ] P0: Support session ID extraction patterns (3 patterns)
  - Pattern 1: Session ID in header/stdout like "Session: <id>" or "[Session: <id>]"
  - Pattern 2: Session ID in structured JSON output if available
  - Pattern 3: Session ID in file path or metadata returned by CLI
  - [ ] P0: Implement regex patterns for each extraction method
  - [ ] P0: Fallback through patterns in order until one succeeds

- [ ] P0: Support `<promise>COMPLETE</promise>` completion detection
  - [ ] P0: Add completion detection in run() method
  - [ ] P0: Check output for exact string `<promise>COMPLETE</promise>`
  - [ ] P0: Set success=true when detected, even if other output exists

- [ ] P0: Add project mode support via constructor parameter
  - [ ] P0: When `useProjectMode=true`, add `-p` flag to commands
  - [ ] P0: When `useProjectMode=false`, omit `-p` flag
  - [ ] P0: Log project mode status when running

### Implementation Notes
- Claude Code CLI may have different flag syntax - research actual commands
- Session ID extraction patterns may need adjustment based on actual CLI output
- Interactive mode may require TUI handling different from OpenCode
- Consider using Bun.spawn for process execution consistent with OpenCodeAdapter

---

## JTBD-101-SPEC-001: Agent Selection [P0 - DEPENDS ON JTBD-102-SPEC-001, JTBD-102-SPEC-002]

**Prerequisites: JTBD-102-SPEC-001 and JTBD-102-SPEC-002 must be completed first.**

- [ ] P0: Add CLI flags for agent selection
  - [ ] P0: Add `--agent` flag to `run` command (accepts "opencode" or "claude-code")
  - [ ] P0: Add `--agent` flag to `step` command (accepts "opencode" or "claude-code")
  - [ ] P0: Validate agent flag values (error on unknown agent)

- [ ] P0: Add environment variable support
  - [ ] P0: Support `RALPHCTL_AGENT` environment variable
  - [ ] P0: Valid values: "opencode", "claude-code"
  - [ ] P0: Validate env var value (warn and use default if invalid)

- [ ] P0: Implement priority resolution
  - [ ] P0: Priority order: CLI flag > environment variable > default ("opencode")
  - [ ] P0: Document priority in help text for --agent flag

- [ ] P0: Create agent factory in `src/lib/agents/factory.ts`
  - [ ] P0: Create `createAgent(type: AgentType, useProjectMode?: boolean): AgentAdapter`
  - [ ] P0: Implement eager availability check during factory creation
  - [ ] P0: Throw clear error with installation URL when agent unavailable
    - OpenCode URL: https://opencode.ai
    - Claude Code URL: https://claude.com/claude-code

- [ ] P0: Update runHandler to use agent factory
  - [ ] P0: Import createAgent from factory.ts
  - [ ] P0: Resolve agent type from CLI flag > env > default
  - [ ] P0: Create agent instance via factory
  - [ ] P0: Pass agent instance to iteration loop instead of hardcoded OpenCodeAdapter

- [ ] P0: Update stepHandler to use agent factory
  - [ ] P0: Same pattern as runHandler
  - [ ] P0: Pass agent instance to interactive execution

- [ ] P0: Add clear error messages for unavailable agents
  - [ ] P0: Error message format: "{agent} is not installed or not in PATH. Install from: {url}"
  - [ ] P0: Exit with code 1 on agent unavailability

### Implementation Notes
- Default agent should be "opencode" for backward compatibility
- Factory should cache agent instances or create fresh each time (decide based on state needs)
- Installation URLs should be accurate and clickable
- Consider adding --force flag to bypass availability check for testing

---

## JTBD-103-SPEC-001: Claude Code Project Mode [P1 - DEPENDS ON JTBD-102-SPEC-002, JTBD-101-SPEC-001]

**Prerequisites: JTBD-102-SPEC-002 and JTBD-101-SPEC-001 must be completed first.**

- [ ] P1: Add --no-project-mode CLI flag
  - [ ] P1: Add `--no-project-mode` flag to `run` command
  - [ ] P1: Add `--no-project-mode` flag to `step` command
  - [ ] P1: Flag is boolean (true when present, false when absent)

- [ ] P1: Update agent factory to accept project mode parameter
  - [ ] P1: Add `useProjectMode?: boolean` parameter to createAgent()
  - [ ] P1: Default value: true
  - [ ] P1: Pass parameter to ClaudeCodeAdapter constructor

- [ ] P1: Implement project mode in ClaudeCodeAdapter
  - [ ] P1: When `useProjectMode=true`, add `-p` flag to `claude` commands
  - [ ] P1: When `useProjectMode=false`, omit `-p` flag
  - [ ] P1: Log "Project mode: enabled" or "Project mode: disabled" at start

- [ ] P1: Handle project mode for OpenCodeAdapter (no-op)
  - [ ] P1: OpenCodeAdapter constructor accepts useProjectMode but ignores it
  - [ ] P1: Log "Project mode: N/A (OpenCode)" or simply don't log project mode status

- [ ] P1: Update PROMPT_build.md and PROMPT_plan.md templates
  - [ ] P1: Add note about project mode availability for Claude Code users
  - [ ] P1: Document --no-project-mode flag usage

### Implementation Notes
- Project mode is Claude Code specific feature - OpenCode should silently ignore
- Logging should indicate whether project mode is applicable to selected agent
- Consider adding --project-mode flag as explicit opt-in (default true, explicit false with --no-project-mode)

---

## JTBD-104-SPEC-001: Agent-Aware Session Management [P2 - DEPENDS ON ALL ABOVE]

**Prerequisites: All JTBD-102, JTBD-101, and JTBD-103 specs must be completed first.**

- [ ] P2: Update SessionState interface to include agent information
  - [ ] P2: Add optional `agent: AgentType` field to SessionState
  - [ ] P2: Add optional `projectMode: boolean` field to SessionState
  - [ ] P2: Update src/domain/types.ts with new fields

- [ ] P2: Update SessionsFile interface with version field
  - [ ] P2: Add `version: number` field (set to 1 for first version)
  - [ ] P2: Update src/domain/types.ts

- [ ] P2: Implement lazy migration for existing sessions
  - [ ] P2: In readSessionsFile(), check for version field
  - [ ] P2: If version missing or old, set default agent to "opencode" for all existing sessions
  - [ ] P2: Set projectMode to undefined for existing sessions (unknown)

- [ ] P2: Update runHandler to capture agent in SessionState
  - [ ] P2: Include agent type when creating SessionState after each iteration
  - [ ] P2: Include projectMode setting when creating SessionState

- [ ] P2: Update inspectHandler for agent-aware export routing
  - [ ] P2: InspectEntry should include agent and projectMode fields
  - [ ] P2: Route each session export to correct agent adapter based on session.agent
  - [ ] P2: If agent unavailable during inspection, log warning and skip that session

- [ ] P2: Add graceful degradation during inspection
  - [ ] P2: When exporting session with unknown/ unavailable agent:
    - Log warning: "Skipping session {sessionId}: agent {agent} not available"
    - Continue processing other sessions
    - Include warning in final inspect output summary

- [ ] P2: Update writeSessionsFile to include version field
  - [ ] P2: On write, set version: 1
  - [ ] P2: Maintain backward compatibility with older readers

- [ ] P2: Include agent info in InspectEntry output
  - [ ] P2: Add `agent: AgentType` field to InspectEntry
  - [ ] P2: Add `projectMode?: boolean` field to InspectEntry
  - [ ] P2: Update inspect.json schema documentation

### Implementation Notes
- Existing sessions without agent field should default to "opencode" (lazy migration)
- inspect.json should include agent info for each session for debugging/reproducibility
- Consider adding validation that session.agent matches current selected agent during export
- Project mode stored per-session allows replay with same settings

---

## Implementation Notes

### Cross-Spec Dependencies
- JTBD-102-SPEC-001 is the FOUNDATION - must implement first
- OpenCodeAdapter currently exists but does NOT implement AgentAdapter interface
- No AgentType enum exists in the codebase
- src/lib/agents/ directory does not exist
- All JTBD specs depend on the AgentAdapter interface being defined first

### Existing Code Patterns to Follow
- Bun.spawn-based process runner from src/lib/process/
- Error handling: console.error() + process.exit(1)
- Testing: mock.module() pattern with beforeEach()
- File writing: JSON.stringify(data, null, 2) pattern
- Session state: readSessionsFile() + writeSessionsFile() pattern

### Learnings to Add
- Agent selection priority: CLI flag > env var > default
- Claude Code project mode adds -p flag when enabled
- Agent metadata includes version, availability, and type
- Session migration defaults old sessions to OpenCode agent
- Inspect handler routes exports based on session.agent field
