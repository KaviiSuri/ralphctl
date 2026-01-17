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
- [x] P1: Add permissions posture handling and log effective posture before first iteration (jbtd-003-spec-001/002)
- [ ] P2: Validate command expectations and `rctl` alias behaviors against jbtd-001-spec-001/003

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
  - [x] P2: Export session data matching JBTD-006 specs (separate spec)

### Summary

Implemented complete session management and state capture infrastructure for ralphctl:

1. **Domain Types**: Added `SessionState` and `SessionsFile` interfaces in src/domain/types.ts, plus `sessionId` field to `OpenCodeRunResult`

2. **Session ID Extraction**: Implemented robust extraction from OpenCode CLI output using regex patterns in src/lib/opencode/adapter.ts

3. **State Persistence**: Created src/lib/state/index.ts with utilities for managing `.ralphctl/ralph-sessions.json` - directory creation, reading, and atomic writing of session data

4. **Iteration Loop Integration**: Modified src/lib/commands/run.ts to capture session state after each iteration, persisting iteration count, session ID, timestamp, mode, and prompt

5. **Markers**: Updated both start and end iteration markers to include session IDs for clear progress visibility

6. **Testing**: Comprehensive test coverage including session ID extraction, file utilities, marker formatting, and run loop integration

7. **Inspect Handler**: Updated to read session history from the sessions file for export functionality
