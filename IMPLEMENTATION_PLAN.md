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
- [x] P0: Create a shared process runner under `src/lib/process/` (Bun.spawn-based) for CLI execution with consistent stdout/stderr capture
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
- [x] P1: Implement `step` prompt overrides per jbtd-007-spec-001/002 (mode-aware prompt arguments)
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

- [ ] P2: Consider adding output file path parameter
   - [ ] P2: Allow user to specify output file via CLI flag: `--output inspect.json`
   - [ ] P2: Default to `inspect.json` in current working directory

- [ ] P2: Add JSON parsing validation for export data
   - [ ] P2: Verify export output is parseable JSON before writing
   - [ ] P2: Warn if export is invalid JSON but still include raw output
   - [ ] P2: This ensures jq compatibility (jbtd-006-spec-002) without modifying raw output

- [ ] P2: Consider file naming convention with mode filtering
   - [ ] P2: Could add `--mode plan|build` flag to filter sessions by mode
   - [ ] P2: Would require adding mode field to InspectEntry schema
   - [ ] P2: Keep for future enhancement if needed

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

## Implementation Notes

### Cross-Spec Dependencies
- jbtd-006-spec-001 (Export Fidelity): ✅ Already satisfied by OpenCodeAdapter.export() returning raw stdout
- jbtd-006-spec-002 (Run Artifact Packaging): Requires P0 tasks for JSON file output
- jbtd-006-spec-003 (Inspect Schema): Requires P0 tasks for validation

### Existing Code Patterns to Follow
- File writing: `JSON.stringify(data, null, 2)` pattern from src/lib/state/index.ts:23
- Error handling: `console.error(message)` + `process.exit(1)` from inspect.ts:12-13
- Testing: mock.module() pattern from handlers.spec.ts with beforeEach()
- State reading: `readSessionsFile()` from src/lib/state/index.ts:26

### Learnings to Add
- Inspect output goes to JSON file in CWD (not console)
- Export failures skip individual sessions, continue processing
- Empty sessions output empty array `[]`
- Progress logging via console for user feedback
- Validation errors abort inspect generation with clear message
- InspectEntry interface defines output schema with 4 required fields: sessionId, iteration, startedAt, export
- Field validation happens before export call to fail fast on corrupted data
- Model defaults from jbtd-002-spec-004: {smart}→openai/gpt-5.2-codex, {fast}→zai-coding-plan/glm-4.7
- Model placeholder resolver replaces {smart} and {fast} with actual model IDs before passing to OpenCode CLI
- OpenCodeAdapter accepts optional model parameter and conditionally adds --model flag to CLI commands
- Model overrides work identically in both run and step commands for consistency per jbtd-007-spec-002
- clerc's scriptName is hardcoded, not auto-detected; use process.argv[1].split("/").pop() to detect actual command name
- Dynamic command name detection allows both 'ralphctl' and 'rctl' aliases to display correct help text
- package.json bin section supports multiple aliases pointing to same entrypoint file
