# PRD: Project-Scoped Ralph Loops

## Overview

Add project-based organization to ralphctl, allowing multiple independent feature tracks with their own specs, implementation plans, and progress tracking. Include CLI commands (for Claude Code and OpenCode) that guide users through a structured PRD creation workflow.

---

## Goals

1. **Organize work by project** - Each feature/milestone gets its own folder with dedicated specs and tracking
2. **Guided PRD workflow** - Commands that walk users through research → PRD → topics → tasks → specs
3. **Scoped Ralph loops** - Run plan/build loops against a specific project's specs and implementation plan
4. **No over-engineering** - Keep global prompts global, only scope what needs scoping

---

## Non-Goals

- Automatic project detection or inference
- Cross-project dependency tracking
- Parallel project execution
- Project templates beyond the basic structure
- GUI or web interface

---

## User Stories

### US-1: Create a New Project
**As a** developer starting a new feature
**I want to** run `/project:new auth-system`
**So that** I get a folder structure ready for planning

**Acceptance Criteria**:
- Creates `projects/auth-system/` with template files
- Creates empty `specs/` subfolder
- Prints next step: "Run `/project:research auth-system` to begin"

---

### US-2: Research Phase
**As a** developer exploring a feature
**I want to** run `/project:research auth-system`
**So that** I can capture initial research and context

**Acceptance Criteria**:
- Opens/updates `projects/auth-system/01-research.md`
- Agent prompts for: problem statement, existing solutions, constraints, open questions
- Suggests when research is sufficient to move on
- Prints next step: "Run `/project:prd auth-system` to define requirements"

---

### US-3: PRD Phase
**As a** developer defining requirements
**I want to** run `/project:prd auth-system`
**So that** I can create a clear product requirements document

**Acceptance Criteria**:
- Opens/updates `projects/auth-system/02-prd.md`
- Agent prompts for: goals, non-goals, user stories, acceptance criteria
- Validates PRD completeness (has goals, has at least one user story)
- Prints next step: "Run `/project:topics auth-system` to break into topics of concern"

---

### US-4: Jobs to Be Done Phase
**As a** developer breaking down work
**I want to** run `/project:jtbd auth-system`
**So that** I can identify high-level jobs to be done

**Acceptance Criteria**:
- Opens/updates `projects/auth-system/03-jtbd.md`
- Agent analyzes PRD and suggests JTBD breakdown
- Each JTBD is a high-level user goal (e.g., "User Authentication", "Session Management")
- JTBDs are numbered (JTBD-001, JTBD-002, etc.)
- Prints next step: "Run `/project:tasks auth-system` to break JTBDs into granular tasks"

---

### US-4b: Tasks Phase
**As a** developer planning granular work
**I want to** run `/project:tasks auth-system`
**So that** I get atomic tasks under each JTBD with clear dependencies

**Acceptance Criteria**:
- Opens/updates `projects/auth-system/04-tasks.md`
- Agent analyzes JTBDs and breaks each into granular tasks
- Each task passes "one sentence without 'and'" test
- Tasks have: JTBD reference, ID, description, dependencies
- **Generates dependency graph** (ASCII visual + matrix table)
- **Generates linearized implementation order** (waves of parallelizable tasks)
- Prints next step: "Run `/project:hld auth-system` for high-level design (optional) or `/project:specs auth-system` to generate specs"

---

### US-5: HLD Phase (Optional)
**As a** developer planning architecture
**I want to** run `/project:hld auth-system`
**So that** I can document high-level design decisions

**Acceptance Criteria**:
- Opens/updates `projects/auth-system/05-hld.md`
- Agent prompts for: components, data flow, interfaces, dependencies
- Links back to JTBDs and tasks
- Prints next step: "Run `/project:specs auth-system` to generate spec files"

---

### US-6: Specs Phase
**As a** developer ready to implement
**I want to** run `/project:specs auth-system`
**So that** I get spec files ready for Ralph loops

**Acceptance Criteria**:
- Creates spec files in `projects/auth-system/specs/`
- **One spec per task** (not per JTBD)
- Spec naming: `jtbd-NNN-task-MMM.md` (e.g., `jtbd-001-task-001.md`)
- **Each spec written by isolated subagent** (Sonnet model)
- **Subagents read ONLY from filesystem artifacts** (01-research.md, 02-prd.md, 03-jtbd.md, 04-tasks.md) - no conversation context
- This validates that artifacts are self-contained and complete
- Each spec includes: purpose, acceptance criteria, verification steps
- Creates/updates `projects/auth-system/IMPLEMENTATION_PLAN.md` with task list
- Prints next step: "Run `ralphctl run plan --project auth-system` to start planning"

---

### US-7: Run Project-Scoped Loop
**As a** developer ready to implement
**I want to** run `ralphctl run plan --project auth-system`
**So that** the Ralph loop uses my project's specs and plan

**Acceptance Criteria**:
- Reads specs from `projects/auth-system/specs/`
- Uses `projects/auth-system/IMPLEMENTATION_PLAN.md` for task tracking
- Still uses global `PROMPT_plan.md` and `PROMPT_build.md`
- Session tracking tags iterations with project name
- Same for `ralphctl run build --project auth-system`

---

### US-8: Step Through Project
**As a** developer doing interactive work
**I want to** run `ralphctl step plan --project auth-system`
**So that** I can do single iterations against my project

**Acceptance Criteria**:
- Same scoping as `run` command
- Opens interactive TUI with project context

---

### US-9: Inspect Project Sessions
**As a** developer reviewing progress
**I want to** run `ralphctl inspect --project auth-system`
**So that** I see only sessions for that project

**Acceptance Criteria**:
- Filters sessions by project tag
- Same export format as global inspect

---

## Technical Approach

### Folder Structure
```
projects/
├── auth-system/
│   ├── 01-research.md
│   ├── 02-prd.md
│   ├── 03-jtbd.md          # Jobs to Be Done
│   ├── 04-tasks.md         # Granular tasks under each JTBD
│   ├── 05-hld.md           # Optional
│   ├── IMPLEMENTATION_PLAN.md
│   └── specs/
│       ├── jtbd-001-task-001.md   # One spec per task
│       ├── jtbd-001-task-002.md
│       ├── jtbd-002-task-001.md
│       └── ...
```

### Command Files
```
.claude/commands/
├── project:new.md
├── project:research.md
├── project:prd.md
├── project:jtbd.md
├── project:tasks.md
├── project:hld.md
└── project:specs.md

.opencode/commands/
└── (same structure)
```

### ralphctl Changes
- Add `--project <name>` flag to `run`, `step`, `inspect`
- Modify prompt resolver to support `{project}` placeholder
- Add project tag to session state
- No changes to agent adapters

### Global Prompt Updates
```markdown
# PROMPT_plan.md (updated)
Study specs in `{project}/specs/` to learn specifications.
Update `{project}/IMPLEMENTATION_PLAN.md` with task status.
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Command proliferation (7 new commands) | Clear naming convention, each command is small |
| User skips stages | Each command checks prerequisites exist |
| Project folder deleted mid-loop | Error message with recovery instructions |
| Existing flat specs | Can coexist; `--project` is opt-in |

---

## Success Metrics

1. Can create a new project and go through all stages to specs in < 30 minutes
2. Ralph loops work correctly with `--project` flag
3. Multiple projects can coexist without interference
4. No changes required to existing global workflows

---

## Resolved Questions

1. **Command naming**: `/project:new` (colon separator) ✓
2. **Prerequisite checking**: Warn if missing, allow user to proceed ✓
3. **Kai integration**: Not automatic, future consideration ✓
4. **Spec granularity**: One spec per task (tasks are granular) ✓
5. **Archive/cleanup**: Not needed, delete or leave folder ✓
6. **Hierarchy**: JTBD (high-level) → Tasks (granular) → Specs (one per task) ✓
