# Implementation Plan: Project-Scoped Ralph Loops

## Overview

This implementation plan tracks work to add project-scoped Ralph loops to ralphctl, enabling multiple independent feature tracks with their own specs, implementation plans, and progress tracking.

**Current State:** ralphctl v0.0.0 has solid architecture for global (flat) Ralph loops. Project-scoped functionality is in progress with **7 of 23 tasks complete** (foundation layer complete: session tagging, placeholder resolution, prompt template updates, --project flag for run, step, and inspect commands, and CLI tool detection).

**Architecture:** Domain-driven design with adapter pattern, clean separation of concerns, Bun-based execution, and TypeScript throughout.

---

## Implementation Status

### 🟢 Completed

#### 003-005: Tag Sessions with Project Name
**Status:** ✅ COMPLETED
**Priority:** HIGH (blocks multiple tasks)
**Effort:** Medium
**Description:** Add `project?: string` field to SessionState in ralph-sessions.json. Write when `--project` flag used, omit otherwise.
**Files Modified:**
- `src/domain/types.ts` - Added `project?: string` to SessionState interface
- `src/lib/state/index.ts` - Updated migration logic to preserve project field
- `tests/state.spec.ts` - Added comprehensive tests for project field handling
**Acceptance Criteria:**
- [x] SessionState includes optional project field
- [x] Tagged sessions include project field in JSON
- [x] Untagged sessions omit field (backward compatible)
- [x] Old sessions without field read without errors
**Dependencies:** None
**Blocks:** 003-001, 003-002, 003-003
**Learnings:**
- Migration logic successfully preserves project field across state updates
- All tests passing (108 total), backward compatible with existing sessions
- TypeScript types enforce optional nature of field correctly

---

#### 003-004: Support {project} Placeholder in Prompts
**Status:** ✅ COMPLETED
**Priority:** HIGH (blocks prompt updates)
**Effort:** Small
**Description:** Modify prompt resolver to detect `{project}` placeholder and replace with `projects/<name>` when `--project` is used. Error if placeholder exists but no `--project` flag.
**Files Modified:**
- `src/lib/prompts/resolver.ts` - Added `resolvePromptPlaceholders()` function and placeholder detection logic
- `src/domain/types.ts` - Added `project?: string` to ResolvePromptOptions interface
- `tests/prompt-resolver.spec.ts` - Added 13 comprehensive tests for placeholder resolution
- `tests/handlers.spec.ts` - Updated mocks to include placeholder resolution
**Acceptance Criteria:**
- [x] Detects `{project}` in prompt content
- [x] Replaces with `projects/<name>` when flag provided
- [x] Errors if placeholder but no `--project` flag
- [x] Works with both PROMPT_plan.md and PROMPT_build.md
- [x] Multiple placeholders handled correctly
**Dependencies:** None
**Blocks:** 003-006
**Learnings:**
- Implemented clear error messages when placeholder found without --project flag
- Supports multiple occurrences of {project} placeholder in same prompt
- All tests passing, TypeScript type checking validates ResolvePromptOptions correctly

---

#### 003-006: Update Global Prompt Templates
**Status:** ✅ COMPLETED
**Priority:** MEDIUM
**Effort:** Small
**Description:** Update `ralphctl init` command templates to use `{project}` placeholder for specs and implementation plan paths instead of hardcoded paths.
**Files Modified:**
- `src/lib/templates/index.ts` - Updated PLAN_TEMPLATE and BUILD_TEMPLATE to use {project} placeholder
**Acceptance Criteria:**
- [x] PROMPT_plan.md template uses `{project}/specs/`
- [x] PROMPT_plan.md template uses `{project}/IMPLEMENTATION_PLAN.md`
- [x] PROMPT_build.md template uses `{project}/specs/`
- [x] PROMPT_build.md template uses `{project}/IMPLEMENTATION_PLAN.md`
- [x] Works in global mode (resolves to `.`)
- [x] Works in project mode (resolves to `projects/<name>/`)
**Dependencies:** 003-004
**Blocks:** 003-001, 003-002, 003-003
**Learnings:**
- Templates now use {project} placeholder which gets resolved by resolvePromptPlaceholders() in src/lib/prompts/resolver.ts
- When no --project flag: {project} → `.` (global mode)
- When --project flag: {project} → `projects/<name>` (project mode)
- All 108 tests passing after changes
- TypeScript compilation successful

---

#### 003-001: Add --project Flag to Run Command
**Status:** ✅ COMPLETED
**Priority:** HIGH
**Effort:** Medium
**Description:** Add `--project <name>` flag to `ralphctl run` that scopes specs and implementation plan to `projects/<name>/`.
**Files Modified:**
- `src/cli.ts` - Added `--project` flag to run command
- `src/lib/commands/run.ts` - Added project validation and path resolution
- `src/lib/projects/validation.ts` - New module for project validation (created)
- `tests/project-validation.spec.ts` - Comprehensive tests for project validation (created)
**Acceptance Criteria:**
- [x] `--project` flag accepted with short alias `-p`
- [x] Validates project folder exists
- [x] Loads specs from `projects/<name>/specs/`
- [x] Loads implementation plan from `projects/<name>/IMPLEMENTATION_PLAN.md`
- [x] Resolves `{project}` placeholder in prompts
- [x] Tags sessions with project name
- [x] Backward compatible (no flag = global mode)
- [x] Clear error if project doesn't exist
**Dependencies:** ✅ 003-004, ✅ 003-005, ✅ 003-006
**Blocks:** None (leaf task)
**Learnings:**
- Clerc CLI library doesn't support TypeScript alias property in current version, documented in description instead
- Project validation runs before agent execution to provide early feedback
- resolveProjectPaths() handles both global and project-scoped modes cleanly
- Session state spread operator (...) cleanly adds optional project field
- All 122 tests passing including 18 new project validation tests
- TypeScript type checking passes with no errors

---

#### 004-001: Detect Available CLI Tools
**Status:** ✅ COMPLETED
**Priority:** HIGH (blocks folder creation)
**Effort:** Medium
**Description:** Create utility to detect if `claude` and/or `opencode` CLIs are available in PATH using cross-platform `which`/`where`.
**Files Created:**
- `src/lib/tools/detection.ts` - Module for tool availability detection with detectAvailableTools() and isCommandAvailable()
- `tests/tool-detection.spec.ts` - Comprehensive test suite with 10 test cases
**Acceptance Criteria:**
- [x] Detects `claude` command availability
- [x] Detects `opencode` command availability
- [x] Returns structured result (ToolDetectionResult) with claude, opencode, hasAny, hasBoth fields
- [x] Works on macOS, Linux, Windows (uses 'which' on Unix, 'where' on Windows)
- [x] <100ms per tool (1-second timeout configured)
- [x] Handles non-executable commands gracefully (catches all errors)
**Dependencies:** None
**Blocks:** 004-002, 004-004, 004-005
**Learnings:**
- Dependency injection with CommandExecutor type enables testing without mock.module() global state issues
- Bun test's mock.module() affects all tests globally - better to use dependency injection for testability
- execSync with stdio: "pipe" suppresses command output cleanly
- Cross-platform command checking works well with platform-based conditional logic
- All 133 tests passing, no TypeScript errors

---

### 🟡 In Progress

### 🟡 Wave 1: Foundation Tasks (No Dependencies)

These tasks can be implemented immediately in parallel as they have no dependencies.

---

#### 004-003: Verify Repo Root
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Medium
**Description:** Check if current directory is git repository root using `git rev-parse --show-toplevel`. Warn if not in repo or in subdirectory.
**Files to Create:**
- `src/lib/repo-verification.ts` - New module for git repo validation
**Acceptance Criteria:**
- [ ] Detects git repository correctly
- [ ] Identifies repo root path
- [ ] Warns if not at repo root
- [ ] Prompts for user confirmation
- [ ] Returns structured verification result
- [ ] Works with worktrees
- [ ] Handles missing git gracefully
**Dependencies:** None
**Blocks:** 004-004, 004-005

---

### 🟡 Wave 2: Tool Detection & Prompt Updates (Depends on Wave 1)

These tasks depend on Wave 1 foundation being complete.

#### 004-002: Prompt User When No Tools Detected
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Medium
**Description:** When tool detection finds neither tool, prompt user to choose: Claude Code, OpenCode, or Both. Pass choice to folder creation.
**Files to Create:**
- `src/lib/tool-prompting.ts` - New module for interactive tool selection
**Acceptance Criteria:**
- [ ] Shows clear warning about missing tools
- [ ] Offers numbered options (1-3)
- [ ] Accepts multiple input formats (number, tool name)
- [ ] Case-insensitive matching
- [ ] Re-prompts on invalid input
- [ ] Handles Ctrl+C gracefully
- [ ] Passes user choice to downstream tasks
**Dependencies:** 004-001
**Blocks:** 004-004, 004-005

---

#### 004-004: Create local .claude/commands/ folder
**Status:** Not Started
**Priority:** HIGH
**Effort:** Small
**Description:** Create `.claude/commands/` directory at repo root (NOT global ~/.claude/) when Claude Code is detected or selected.
**Files to Create:**
- `src/lib/command-infrastructure.ts` - New module for folder creation
**Acceptance Criteria:**
- [ ] Creates `.claude/commands/` at repo root
- [ ] Only creates when Claude Code detected/selected
- [ ] Idempotent (no error if exists)
- [ ] Verifies writability after creation
- [ ] Uses absolute paths, never `~/.claude/`
**Dependencies:** 004-001, 004-003
**Blocks:** 004-006

---

#### 004-005: Create local .opencode/commands/ folder
**Status:** Not Started
**Priority:** HIGH
**Effort:** Small
**Description:** Create `.opencode/commands/` directory at repo root (NOT global ~/.config/opencode/) when OpenCode is detected or selected.
**Files to Modify:**
- `src/lib/command-infrastructure.ts` - Add OpenCode folder creation logic
**Acceptance Criteria:**
- [ ] Creates `.opencode/commands/` at repo root
- [ ] Only creates when OpenCode detected/selected
- [ ] Idempotent (no error if exists)
- [ ] Verifies writability after creation
- [ ] Uses absolute paths, never global config
**Dependencies:** 004-001, 004-003
**Blocks:** 004-006

---


#### 004-006: Install Command Files
**Status:** Not Started
**Priority:** HIGH
**Effort:** Medium
**Description:** Copy all 7 project command files (project:new through project:specs) to `.claude/commands/` and/or `.opencode/commands/` based on tool detection/selection.
**Files to Create:**
- `src/lib/commands/install-project-commands.ts` - New command to install command files
- `templates/commands/*.md` - 7 command file templates
**Acceptance Criteria:**
- [ ] 7 command files exist as templates
- [ ] Copies to `.claude/commands/` when available
- [ ] Copies to `.opencode/commands/` when available
- [ ] Copies to both when both available
- [ ] Idempotent (safe to run multiple times)
- [ ] Reports installation summary
- [ ] Uses markdown with proper YAML frontmatter
**Dependencies:** 004-004, 004-005
**Blocks:** None (leaf task for command infrastructure)

---

### 🟡 Wave 3: Project Command Infrastructure (Depends on Wave 2)

These tasks depend on command files being installed.

#### 001-001: Create Project Folder Structure
**Status:** Not Started
**Priority:** HIGH
**Effort:** Medium
**Description:** Implement core folder creation logic for projects. Create `projects/<name>/specs/` structure with validation.
**Files to Create:**
- `src/lib/projects/init.ts` - New module for project initialization
**Acceptance Criteria:**
- [ ] Validates project name format
- [ ] Creates `projects/` directory if needed
- [ ] Creates `projects/<name>/specs/` structure
- [ ] Error if project already exists
- [ ] Works from git repo root
- [ ] Clear error messages for invalid names
**Dependencies:** None
**Blocks:** 001-002

---

#### 001-002: Generate Template Files
**Status:** Not Started
**Priority:** HIGH
**Effort:** Medium
**Description:** Create template files (01-research.md through 05-hld.md, IMPLEMENTATION_PLAN.md) with placeholder content in project folder.
**Files to Modify:**
- `src/lib/projects/init.ts` - Add template generation logic
**Acceptance Criteria:**
- [ ] Creates all 6 template files
- [ ] Each file has proper sections with placeholders
- [ ] Files use consistent markdown formatting
- [ ] Don't overwrite existing files (warn instead)
- [ ] Atomic creation (all or none)
**Dependencies:** 001-001
**Blocks:** 001-003

---

#### 001-003: Print Initialization Summary
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Small
**Description:** Display user-friendly summary showing created folder structure and next command to run.
**Files to Modify:**
- `src/lib/projects/init.ts` - Add summary printing logic
**Acceptance Criteria:**
- [ ] Shows success message with project name
- [ ] Displays folder structure tree
- [ ] Lists all created template files
- [ ] Prints next step: `/project:research <name>`
- [ ] Matches ralphctl's CLI output style
**Dependencies:** 001-002
**Blocks:** None

---

### 🟡 Wave 4: Planning Commands (Depends on Wave 3)

These 6 commands provide guided workflow through research → PRD → JTBD → Tasks → Specs.

#### 002-001: Create /project:research command
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Large
**Description:** Create command file that guides users through capturing research (problem statement, existing solutions, constraints, open questions).
**Files to Create:**
- `templates/commands/project:research.md` - Claude Code command
- `templates/commands/project:research.md` - OpenCode command (identical content)
**Acceptance Criteria:**
- [ ] Command files exist in both tool directories
- [ ] Prompts for research sections
- [ ] Creates/updates `01-research.md`
- [ ] Warns if file exists, offers overwrite/append
- [ ] Prints next step: `/project:prd <name>`
- [ ] Handles missing project argument
**Dependencies:** 004-006 (command must be installed)
**Blocks:** 002-007, 002-008

---

#### 002-002: Create /project:prd command
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Large
**Description:** Create command that guides PRD creation (goals, non-goals, user stories with acceptance criteria). Reads research.md if present.
**Files to Create:**
- `templates/commands/project:prd.md` - Claude Code command
- `templates/commands/project:prd.md` - OpenCode command
**Acceptance Criteria:**
- [ ] Prompts for PRD sections
- [ ] Validates at least one user story exists
- [ ] Reads `01-research.md` for context
- [ ] Warns if missing but allows proceeding
- [ ] Creates/updates `02-prd.md`
- [ ] Prints next step: `/project:jtbd <name>`
**Dependencies:** 004-006
**Blocks:** 002-007, 002-008

---

#### 002-003: Create /project:jtbd command
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Large
**Description:** Create command that breaks PRD into high-level jobs to be done (JTBDs). Reads PRD.md if present.
**Files to Create:**
- `templates/commands/project:jtbd.md` - Claude Code command
- `templates/commands/project:jtbd.md` - OpenCode command
**Acceptance Criteria:**
- [ ] Explains JTBD concept to users
- [ ] Reads `02-prd.md` for context
- [ ] Guides creating 2-5 JTBDs
- [ ] Creates `03-jtbd.md` with numbered JTBDs
- [ ] Warns if PRD missing but allows proceeding
- [ ] Prints next step: `/project:tasks <name>`
**Dependencies:** 004-006
**Blocks:** 002-007, 002-008

---

#### 002-004: Create /project:tasks command
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Large
**Description:** Create command that decomposes JTBDs into granular tasks, generates dependency graph (ASCII + matrix), and linearized implementation order (waves).
**Files to Create:**
- `templates/commands/project:tasks.md` - Claude Code command
- `templates/commands/project:tasks.md` - OpenCode command
**Acceptance Criteria:**
- [ ] Reads `03-jtbd.md` for context
- [ ] Enforces "one sentence without 'and'" granularity
- [ ] Validates task ID format (NNN-MMM)
- [ ] Generates ASCII dependency graph
- [ ] Generates dependency matrix table
- [ ] Generates linearized wave-based order
- [ ] Creates `04-tasks.md`
- [ ] Prints next step: `/project:hld` (optional) or `/project:specs`
**Dependencies:** 004-006
**Blocks:** 002-007, 002-008

---

#### 002-005: Create /project:hld command
**Status:** Not Started
**Priority:** LOW
**Effort:** Large
**Description:** Create optional command for high-level design documentation (components, data flow, interfaces, tech decisions).
**Files to Create:**
- `templates/commands/project:hld.md` - Claude Code command
- `templates/commands/project:hld.md` - OpenCode command
**Acceptance Criteria:**
- [ ] Clearly marked as optional
- [ ] Prompts for HLD sections
- [ ] Reads JTBD/Tasks files for context
- [ ] Links components to JTBDs/tasks
- [ ] Creates `05-hld.md`
- [ ] Warns if prerequisite files missing
- [ ] Prints next step: `/project:specs <name>`
**Dependencies:** 004-006
**Blocks:** 002-007, 002-008

---

#### 002-006: Create /project:specs command
**Status:** Not Started
**Priority:** HIGH
**Effort:** Large
**Description:** Create command that parses `04-tasks.md` and spawns isolated subagent (Sonnet model) for each task to generate spec files.
**Files to Create:**
- `templates/commands/project:specs.md` - Claude Code command
- `templates/commands/project:specs.md` - OpenCode command
**Acceptance Criteria:**
- [ ] Parses all tasks from `04-tasks.md`
- [ ] Spawns isolated subagent per task
- [ ] Subagents read ONLY from filesystem artifacts (no conversation context)
- [ ] Creates one spec per task: `jtbd-NNN-task-MMM.md`
- [ ] Creates/updates `IMPLEMENTATION_PLAN.md`
- [ ] Shows progress: "Generating spec N/TOTAL..."
- [ ] Prints next step: `ralphctl run plan --project <name>`
**Dependencies:** 004-006
**Blocks:** 002-007, 002-008

---

#### 002-007: Implement Prerequisite Warning System
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Medium
**Description:** Add prerequisite validation logic to all 6 planning commands that checks for previous stage artifacts, warns if missing, allows user to proceed.
**Files to Modify:**
- `templates/commands/project:research.md` - No prerequisite
- `templates/commands/project:prd.md` - Checks for 01-research.md
- `templates/commands/project:jtbd.md` - Checks for 02-prd.md
- `templates/commands/project:tasks.md` - Checks for 03-jtbd.md
- `templates/commands/project:hld.md` - Checks for 03-jtbd.md and 04-tasks.md
- `templates/commands/project:specs.md` - Checks for 04-tasks.md
**Acceptance Criteria:**
- [ ] Each command checks defined prerequisites
- [ ] Warning shows which files are missing
- [ ] Explains why prerequisites are recommended
- [ ] Prompts: "Continue anyway? (y/N)"
- [ ] Default to "No" (require explicit confirmation)
- [ ] Proceeds if user confirms
- [ ] Aborts cleanly if user declines
**Dependencies:** 002-001 through 002-006
**Blocks:** None (leaf task)

---

#### 002-008: Implement Next Step Messaging
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** Small
**Description:** Add consistent "next step" messaging to all 7 project workflow commands showing user what to do next.
**Files to Modify:**
- `templates/commands/project:new.md` - Next: `/project:research <name>`
- `templates/commands/project:research.md` - Next: `/project:prd <name>`
- `templates/commands/project:prd.md` - Next: `/project:jtbd <name>`
- `templates/commands/project:jtbd.md` - Next: `/project:tasks <name>`
- `templates/commands/project:tasks.md` - Next: `/project:hld` or `/project:specs`
- `templates/commands/project:hld.md` - Next: `/project:specs <name>`
- `templates/commands/project:specs.md` - Next: `ralphctl run plan --project <name>`
**Acceptance Criteria:**
- [ ] All commands print next step message
- [ ] Messages follow consistent format
- [ ] Project name included in suggested command
- [ ] Messages appear at end of command output
- [ ] Tasks command shows both optional and mandatory next steps
**Dependencies:** 002-001 through 002-006
**Blocks:** None (leaf task)

---

### 🟡 Wave 5: Project-Scoped Execution (Depends on Wave 1)

These tasks require foundation (003-004, 003-005, 003-006) to be complete.

#### 003-002: Add --project Flag to Step Command
**Status:** ✅ COMPLETED
**Priority:** HIGH
**Effort:** Medium
**Description:** Add `--project <name>` flag to `ralphctl step` that scopes interactive session to specific project.
**Files Modified:**
- `src/cli.ts` - Added `--project` flag to step command
- `src/lib/commands/step.ts` - Added project validation and path resolution
**Acceptance Criteria:**
- [x] `--project` flag accepted with short alias `-p`
- [x] Validates project folder exists
- [x] Loads specs from `projects/<name>/specs/`
- [x] Loads implementation plan from `projects/<name>/IMPLEMENTATION_PLAN.md`
- [x] Resolves `{project}` placeholder in prompts
- [x] Tags sessions with project name
- [x] Works for both plan and build modes
- [x] Backward compatible (no flag = global mode)
**Dependencies:** ✅ 003-004, ✅ 003-005, ✅ 003-006
**Blocks:** None (leaf task)
**Learnings:**
- stepHandler now validates project paths and passes project to resolvePrompt
- --project flag enables project-scoped prompt placeholder resolution
- runInteractive doesn't return session info (returns void), so step sessions cannot be tracked in ralph-sessions.json
- This is by design - runInteractive is truly interactive and doesn't capture session metadata
- The --project flag is still valuable for path resolution in prompts even without session tracking

---

#### 003-003: Add --project Flag to Inspect Command
**Status:** ✅ COMPLETED
**Priority:** MEDIUM
**Effort:** Small
**Description:** Add `--project <name>` flag to `ralphctl inspect` that filters session display to show only sessions for specified project.
**Files Modified:**
- `src/cli.ts` - Added `--project` flag to inspect command
- `src/lib/commands/inspect.ts` - Added project filtering logic
**Acceptance Criteria:**
- [x] `--project` flag accepted
- [x] Filters sessions to show only matching project tag
- [x] Shows "No sessions found for project '<name>'" when empty
- [x] Unfiltered sessions excluded from project view
- [x] Backward compatible (no flag = show all sessions)
- [x] Export respects filter (if implemented)
**Dependencies:** ✅ 003-004, ✅ 003-005, ✅ 003-006
**Blocks:** None (leaf task)
**Learnings:**
- inspectHandler filters sessions by project field when --project flag provided
- Shows helpful message with tip when no sessions found for a project
- Filters apply before export, so exported JSON contains only project-scoped sessions
- Since step doesn't track sessions, inspect --project will only show results from run command sessions

---

## Summary

**Total Tasks:** 23
**Completed:** 7 ✅
**In Progress:** 0
**Pending:** 16

**Implementation Waves:**
- Wave 1: 4 of 5 foundation tasks complete (80% done)
  - ✅ 003-005: Session tagging with project name
  - ✅ 003-004: {project} placeholder support in prompts
  - ✅ 003-006: Update global prompt templates
  - ✅ 004-001: Detect available CLI tools
  - ⏳ 004-003: Verify repo root
- Wave 2: 5 tasks (depend on Wave 1)
- Wave 3: 3 tasks (depend on Wave 2)
- Wave 4: 7 tasks (depend on Wave 3)
- Wave 5: 3 of 3 tasks complete (100% done)
  - ✅ 003-001: Add --project flag to run command
  - ✅ 003-002: Add --project flag to step command
  - ✅ 003-003: Add --project flag to inspect command

**Critical Path:**
✅ 003-005 (session tagging) → ✅ 003-004 (placeholder support) → ✅ 003-006 (update templates) → ✅ 003-001 (run --project) → user can run project-scoped loops

**Parallelization Opportunities:**
- Wave 1: 1 remaining task (004-003) - can be done independently
- Wave 4: All 7 planning commands can be done in parallel after Wave 3
- Wave 5: All tasks complete ✅

---

## Next Steps

1. ✅ ~~Wave 1 foundation tasks (003-005, 003-004, 003-006)~~ - COMPLETED
2. ✅ ~~Task 003-001: Add --project flag to run command~~ - COMPLETED
3. ✅ ~~Implement remaining Wave 5 tasks (003-002, 003-003)~~ - COMPLETED
4. ✅ ~~Task 004-001: Detect available CLI tools~~ - COMPLETED
5. **Complete remaining Wave 1 task: 004-003 (Verify repo root)**
6. **Move to Wave 2** once Wave 1 complete
7. **Implement Wave 3** (folder creation + template generation)
8. **Create all Wave 4 command files** in parallel

**Immediate Next Actions:**
- Task 004-003: Verify repo root with git

**Testing Strategy:**
- Use bun:test with dependency injection pattern (avoid mock.module() for better test isolation)
- Manual testing of command file behavior in Claude Code/OpenCode
- Integration tests for full workflow: new → research → PRD → JTBD → tasks → specs → run plan --project

**Documentation:**
- Update AGENTS.md with project-scoped execution patterns
- Keep learnings section updated as implementation progresses

---

**Last Updated:** 2026-01-23
**Version:** 1.4
**Recent Changes:** Completed task 004-001 (Detect Available CLI Tools) - implemented CLI tool detection with cross-platform support and dependency injection for testability. Updated progress tracking (7 of 23 tasks complete, Wave 1 at 80%).
