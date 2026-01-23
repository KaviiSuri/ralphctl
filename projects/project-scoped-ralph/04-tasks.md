# Tasks: Project-Scoped Ralph Loops

## JTBD-001: Project Initialization

### Task 001-001: Create project folder structure
**Description**: Given a project name, create `projects/<name>/` with `specs/` subfolder.
**Dependencies**: None
**Acceptance**: Folder exists at `projects/<name>/specs/`

### Task 001-002: Generate template files
**Description**: Create empty/template versions of planning files (01-research.md through 05-hld.md) and IMPLEMENTATION_PLAN.md in the project folder.
**Dependencies**: 001-001
**Acceptance**: All template files exist with placeholder content

### Task 001-003: Print initialization summary
**Description**: After creation, print what was created and the next step (`/project:research <name>`).
**Dependencies**: 001-002
**Acceptance**: User sees folder structure and next command to run

---

## JTBD-002: Guided Planning Workflow

### Task 002-001: Create /project:research command
**Description**: Command that guides user through capturing research: problem statement, existing solutions, constraints, open questions. Saves to `01-research.md`.
**Dependencies**: None
**Acceptance**: Command exists, prompts for research sections, saves file, prints next step

### Task 002-002: Create /project:prd command
**Description**: Command that guides user through PRD creation: goals, non-goals, user stories with acceptance criteria. Saves to `02-prd.md`.
**Dependencies**: None
**Acceptance**: Command exists, prompts for PRD sections, saves file, prints next step

### Task 002-003: Create /project:jtbd command
**Description**: Command that analyzes PRD and helps user break it into high-level jobs to be done. Saves to `03-jtbd.md`.
**Dependencies**: None
**Acceptance**: Command exists, reads PRD if present, suggests JTBDs, saves file, prints next step

### Task 002-004: Create /project:tasks command
**Description**: Command that breaks each JTBD into granular tasks with IDs, descriptions, and dependencies. Generates dependency graph (ASCII + matrix) and linearized implementation order (waves). Saves to `04-tasks.md`.
**Dependencies**: None
**Acceptance**: Command exists, reads JTBD if present, creates task breakdown with dependency graph and linearized order, saves file, prints next step

### Task 002-005: Create /project:hld command
**Description**: Command that guides user through high-level design: components, data flow, interfaces, tech decisions. Saves to `05-hld.md`.
**Dependencies**: None
**Acceptance**: Command exists, prompts for HLD sections, saves file, prints next step

### Task 002-006: Create /project:specs command
**Description**: Command that generates one spec file per task from `04-tasks.md`. **Spawns isolated subagent (Sonnet model) for each spec** that reads ONLY from filesystem artifacts (01-research.md, 02-prd.md, 03-jtbd.md, 04-tasks.md) - no conversation context. This validates artifacts are self-contained. Creates specs in `specs/` folder and initializes `IMPLEMENTATION_PLAN.md`.
**Dependencies**: None
**Acceptance**: Command spawns isolated subagents per spec, subagents use only filesystem, spec files created, implementation plan created, prints next step

### Task 002-007: Implement prerequisite warning system
**Description**: Each command checks if previous stage file exists. If missing, warn user but allow them to proceed if they confirm.
**Dependencies**: 002-001 through 002-006
**Acceptance**: Missing prerequisite shows warning, user can choose to continue or abort

### Task 002-008: Implement "next step" messaging
**Description**: Each command prints the next recommended command after completing its work.
**Dependencies**: 002-001 through 002-006
**Acceptance**: Every command ends with "Next: run `/project:X <name>` to continue"

---

## JTBD-003: Project-Scoped Execution

### Task 003-001: Add --project flag to run command
**Description**: Accept `--project <name>` flag that scopes the run to `projects/<name>/`.
**Dependencies**: None
**Acceptance**: `ralphctl run plan --project foo` uses `projects/foo/specs/` and `projects/foo/IMPLEMENTATION_PLAN.md`

### Task 003-002: Add --project flag to step command
**Description**: Accept `--project <name>` flag that scopes the step to a specific project.
**Dependencies**: None
**Acceptance**: `ralphctl step plan --project foo` works with project-scoped files

### Task 003-003: Add --project flag to inspect command
**Description**: Accept `--project <name>` flag that filters sessions to only show that project's sessions.
**Dependencies**: 003-005
**Acceptance**: `ralphctl inspect --project foo` only shows sessions tagged with "foo"

### Task 003-004: Support {project} placeholder in prompts
**Description**: Modify prompt resolver to replace `{project}` with `projects/<name>` path when --project is used.
**Dependencies**: None
**Acceptance**: `{project}` in PROMPT_plan.md resolves to actual project path

### Task 003-005: Tag sessions with project name
**Description**: When --project is used, add `project: <name>` field to session state in ralph-sessions.json.
**Dependencies**: None
**Acceptance**: Sessions include project field, can be filtered by project

### Task 003-006: Update global prompt templates
**Description**: Update default PROMPT_plan.md and PROMPT_build.md to use `{project}` placeholder for specs and implementation plan paths.
**Dependencies**: 003-004
**Acceptance**: `ralphctl init` creates prompts with `{project}` placeholders

---

## JTBD-004: Command Infrastructure

### Task 004-001: Detect available CLI tools
**Description**: Check if `claude` and/or `opencode` commands are available in PATH.
**Dependencies**: None
**Acceptance**: Returns which tools are available (both, claude-only, opencode-only, none)

### Task 004-002: Prompt user when no tools detected
**Description**: If neither tool is detected, ask user which tool(s) they want to set up commands for.
**Dependencies**: 004-001
**Acceptance**: User can choose: Claude Code, OpenCode, or Both

### Task 004-003: Verify repo root
**Description**: Check if cwd is a git repo root. If not, warn user and ask for confirmation before creating folders.
**Dependencies**: None
**Acceptance**: Non-repo-root shows warning, user must confirm to proceed

### Task 004-004: Create local .claude/commands/ folder
**Description**: Create `.claude/commands/` at repo root (not global ~/.claude/).
**Dependencies**: 004-001, 004-003
**Acceptance**: Local folder created only when Claude Code is detected or user chooses it

### Task 004-005: Create local .opencode/commands/ folder
**Description**: Create `.opencode/commands/` at repo root (not global ~/.config/opencode/).
**Dependencies**: 004-001, 004-003
**Acceptance**: Local folder created only when OpenCode is detected or user chooses it

### Task 004-006: Install command files
**Description**: Copy all `/project:*` command files to the appropriate local command folders.
**Dependencies**: 004-004, 004-005
**Acceptance**: All 7 command files present in each selected tool's commands folder

---

## Task Summary

| JTBD | Task Count | Tasks |
|------|------------|-------|
| 001 - Project Initialization | 3 | 001-001, 001-002, 001-003 |
| 002 - Guided Planning | 8 | 002-001 through 002-008 |
| 003 - Scoped Execution | 6 | 003-001 through 003-006 |
| 004 - Command Infrastructure | 6 | 004-001 through 004-006 |
| **Total** | **23** | |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ JTBD-004: Command Infrastructure (Foundation - do first)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   004-001 ─────┬─────► 004-002                                              │
│   (detect)     │       (prompt if none)                                     │
│                │                                                            │
│                ├─────► 004-004 ─────┐                                       │
│                │       (.claude/)   │                                       │
│   004-003 ─────┤                    ├────► 004-006                          │
│   (repo root)  │                    │      (install files)                  │
│                ├─────► 004-005 ─────┘                                       │
│                        (.opencode/)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ JTBD-001: Project Initialization                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   001-001 ─────► 001-002 ─────► 001-003                                     │
│   (folders)      (templates)     (summary)                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ JTBD-002: Guided Planning Workflow                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   002-001   002-002   002-003   002-004   002-005   002-006                 │
│   (research) (prd)    (jtbd)    (tasks)   (hld)     (specs)                 │
│      │         │         │         │         │         │                    │
│      └─────────┴─────────┴─────────┴─────────┴─────────┘                    │
│                              │                                              │
│                              ▼                                              │
│                     ┌────────┴────────┐                                     │
│                     │                 │                                     │
│                  002-007           002-008                                  │
│                  (prereq)          (next step)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ JTBD-003: Project-Scoped Execution                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   003-004 ─────► 003-006                                                    │
│   (placeholder)   (update prompts)                                          │
│                                                                             │
│   003-005 ─────► 003-001                                                    │
│   (tagging)       (run --project)                                           │
│                │                                                            │
│                ├─► 003-002                                                  │
│                │   (step --project)                                         │
│                │                                                            │
│                └─► 003-003                                                  │
│                    (inspect --project)                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 001-001 | - | 001-002 |
| 001-002 | 001-001 | 001-003 |
| 001-003 | 001-002 | - |
| 002-001 | - | 002-007, 002-008 |
| 002-002 | - | 002-007, 002-008 |
| 002-003 | - | 002-007, 002-008 |
| 002-004 | - | 002-007, 002-008 |
| 002-005 | - | 002-007, 002-008 |
| 002-006 | - | 002-007, 002-008 |
| 002-007 | 002-001..006 | - |
| 002-008 | 002-001..006 | - |
| 003-001 | 003-005 | - |
| 003-002 | 003-005 | - |
| 003-003 | 003-005 | - |
| 003-004 | - | 003-006 |
| 003-005 | - | 003-001, 003-002, 003-003 |
| 003-006 | 003-004 | - |
| 004-001 | - | 004-002, 004-004, 004-005 |
| 004-002 | 004-001 | - |
| 004-003 | - | 004-004, 004-005 |
| 004-004 | 004-001, 004-003 | 004-006 |
| 004-005 | 004-001, 004-003 | 004-006 |
| 004-006 | 004-004, 004-005 | - |

---

## Linearized Implementation Order

Based on dependency graph, here's the execution order:

### Wave 1: No dependencies (can parallelize)
- 004-001 (detect tools)
- 004-003 (verify repo root)
- 003-004 (placeholder support)
- 003-005 (session tagging)

### Wave 2: Depends on Wave 1
- 004-002 (prompt if no tools) → needs 004-001
- 004-004 (.claude folder) → needs 004-001, 004-003
- 004-005 (.opencode folder) → needs 004-001, 004-003
- 003-006 (update prompts) → needs 003-004

### Wave 3: Depends on Wave 2
- 004-006 (install files) → needs 004-004, 004-005
- 003-001 (run --project) → needs 003-005
- 003-002 (step --project) → needs 003-005
- 003-003 (inspect --project) → needs 003-005

### Wave 4: Project commands (can parallelize)
- 001-001 (create folders)
- 002-001 (research cmd)
- 002-002 (prd cmd)
- 002-003 (jtbd cmd)
- 002-004 (tasks cmd)
- 002-005 (hld cmd)
- 002-006 (specs cmd)

### Wave 5: Depends on Wave 4
- 001-002 (templates) → needs 001-001
- 002-007 (prereq warnings) → needs 002-001..006
- 002-008 (next step msg) → needs 002-001..006

### Wave 6: Final
- 001-003 (summary) → needs 001-002

---

**Next step**: Run `/project:specs project-scoped-ralph` to generate spec files.
