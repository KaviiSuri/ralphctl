# Research: Project-Scoped Ralph Loops

## Problem Statement

Currently, ralphctl assumes a flat global structure:
- All specs in a single `specs/` folder
- Single `PROMPT_plan.md` and `PROMPT_build.md` in root
- No concept of projects or milestones
- PRDs get created ad-hoc in root folder during conversations

This doesn't scale for iterative development where you have multiple features, milestones, and ongoing improvements.

---

## Research Sources

### 1. Geoffrey Huntley's Ralph Guide

**Core Philosophy**: "Sit on the loop, not in it"
- The plan is disposable - regenerate when stale
- One spec per topic of concern (not per feature)
- "One Sentence Without 'And'" test for spec granularity

**Key Files**:
- `PROMPT.md` (or `PROMPT_plan.md` / `PROMPT_build.md`) - task instructions
- `AGENTS.md` - operational guidelines (~60 lines max)
- `IMPLEMENTATION_PLAN.md` - persistent task state
- `specs/` - source of truth requirements

**Workflow**:
1. Planning mode: gap analysis between specs and code → task list
2. Building mode: implement tasks, run validation, commit

**Key Insight**: Each loop iteration loads same context files, ensuring fresh context windows with consistent state.

---

### 2. Get Shit Done (GSD) for Claude Code

**Structure**: `.planning/` directory with hierarchy:
- `PROJECT.md` - high-level vision (always loaded)
- `REQUIREMENTS.md` - scoped v1/v2 requirements
- `ROADMAP.md` - phases, milestones
- `STATE.md` - decisions, blockers, session memory
- `research/` - domain knowledge
- Phase-specific: `{phase}-CONTEXT.md`, `{phase}-RESEARCH.md`, `{phase}-{N}-PLAN.md`

**Phase Lifecycle**: Discuss → Plan → Execute → Verify

**Key Patterns**:
- Decision documentation before implementation (CONTEXT.md captures gray areas)
- Atomic git commits per task
- Multi-agent orchestration (research, planning, execution, verification)
- Token context boundaries - keep documents sized appropriately

---

### 3. Matt Pocock's Approach

**Core Philosophy**: Plan mode is non-negotiable
- "Claude Code with and without plan mode is night and day"
- Extreme brevity in plans - "sacrifice grammar for concision"

**Ralph Wiggum Adoption**:
- PRD-based format with JSON user stories
- Each story has: category, description, verification steps, `passes: false` flag
- Agent picks highest-priority incomplete feature, works only on that
- Every commit must pass tests and type checks
- Progress appended to `progress.txt`

**Key Insight**: "Agile for AI" - agent grabs a ticket, drives to verifiable state, finds next one.

---

### 4. Matt Shumer's Approach

**Multi-Stage Task Decomposition**:
1. Initial understanding phase - analyze codebase
2. Clear planning - avoid vague instructions
3. Modular implementation - elegant, minimal, integrable steps

**Workflow**:
- Topic/feature decomposition
- Individual task research/planning
- Quality feedback loops (Kai-style review)
- Final integration

**Key Insight**: Structured decomposition with iterative refinement. Feedback loops catch errors early.

---

## Current ralphctl Architecture

**Commands**:
- `run <mode>` - multi-iteration loop (plan or build)
- `step <mode>` - single interactive iteration
- `inspect` - examine and export sessions
- `init` - create prompt templates

**Session Tracking**: `.ralphctl/ralph-sessions.json`

**Agent Support**: OpenCode and Claude Code via adapter pattern

**Limitations**:
- No project scoping
- No spec enforcement at runtime
- Can't resume interrupted loops
- Single agent per run

---

## Extensibility Research

### Claude Code

| Mechanism | Location | Use Case |
|-----------|----------|----------|
| Commands | `.claude/commands/*.md` | User-triggered prompts |
| Skills | `.claude/skills/*/SKILL.md` | Auto-invoked (description always loaded) |
| Agents | `.claude/agents/*.md` | Isolated execution |
| Hooks | `settings.json` | Intercept/modify actions |
| MCP | `.mcp.json` | External services |

**Command format**: Markdown with YAML frontmatter
- `description` - shown in autocomplete
- `allowed-tools` - tools without permission prompts
- `argument-hint` - autocomplete hint
- `$ARGUMENTS`, `$1`, `$2` - dynamic placeholders
- `@filename` - include file contents

### OpenCode

| Mechanism | Location | Use Case |
|-----------|----------|----------|
| Commands | `.opencode/commands/*.md` | User-triggered prompts |
| Agents | `.opencode/agents/*.md` | Specialized assistants |
| Tools | `.opencode/tools/*.ts` | Custom TypeScript tools |
| Plugins | `.opencode/plugins/` | Comprehensive hooks |
| MCP | `opencode.json` | External services |
| Skills | `.opencode/skills/*/SKILL.md` | Compatible with Claude Code |

**Key difference**: OpenCode has full TypeScript SDK for custom tools and plugins.

---

## Key Decisions

### 1. Project Location
**Decision**: `projects/<name>/` in visible folder (not inside `.ralphctl/`)
**Rationale**: Projects are user content that should be visible, editable, committable

### 2. Prompts: Global vs Project-Specific
**Decision**: Global by default, with `{project}` placeholder
**Rationale**: Prompts define HOW to plan/build, not WHAT. Refine once, use everywhere.

### 3. Implementation Plan
**Decision**: Per-project (`projects/<name>/IMPLEMENTATION_PLAN.md`)
**Rationale**: Each project has different tasks being tracked

### 4. Conversational Setup
**Decision**: Commands in `.claude/commands/` and `.opencode/commands/`
**Rationale**: User-invoked, no context overhead, simple to create/modify

### 5. Stage Progression
**Decision**: Multiple commands (`/project:new`, `/project:research`, etc.)
**Rationale**: User controls when to progress, can jump to any stage

### 6. Command Naming
**Decision**: Use colon separator (`/project:new` not `/project-new`)
**Rationale**: Cleaner, groups related commands visually

### 7. Prerequisite Checking
**Decision**: Warn if previous stage missing, but allow user to proceed
**Rationale**: Flexibility - user might have context from elsewhere

### 8. Kai Integration
**Decision**: Not automatic for now, future consideration
**Rationale**: Keep it simple, user can manually invoke Kai

### 9. Hierarchy: JTBD → Tasks → Specs
**Decision**:
- **JTBD** = Jobs to Be Done (high-level user goals)
- **Tasks** = Topics of Concern (granular work units under each JTBD)
- **Specs** = One spec per task
**Rationale**: Clear hierarchy. JTBD captures "why", tasks capture "what", specs capture "how to verify"

### 10. Archive Strategy
**Decision**: No archive command needed
**Rationale**: Delete folder or leave it. Git history preserves everything.

---

## Hierarchy Clarification

```
JTBD-001: User Authentication (high-level job)
├── Task 001: Login form UI           → jtbd-001-task-001.md
├── Task 002: Form validation         → jtbd-001-task-002.md
└── Task 003: API integration         → jtbd-001-task-003.md

JTBD-002: Session Management (high-level job)
├── Task 001: Token storage           → jtbd-002-task-001.md
└── Task 002: Refresh logic           → jtbd-002-task-002.md
```

**Key insight**: "Topics of Concern" and "Tasks" are synonyms at the same level. They represent granular, atomic units of work that can be independently specified and verified.
