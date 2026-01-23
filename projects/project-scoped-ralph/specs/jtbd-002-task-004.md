# Spec: Create /project:tasks command

## Task ID
002-004

## JTBD
JTBD-002: Guided Planning Workflow

## Purpose
Create a Claude Code/OpenCode command that helps users break down their Jobs to Be Done (JTBDs) into granular, atomic tasks with clear dependencies, a visual dependency graph, and a linearized implementation order.

**Critical behavior**: The command is "conversational-first, write-last". The agent should engage in discussion with the user about task breakdown, discuss dependencies - and ONLY write the `04-tasks.md` file as the FINAL step after all questions are resolved. The file must NOT be written immediately when the command is invoked.

## Context
After users have defined their high-level JTBDs in `03-jtbd.md`, they need to decompose each JTBD into granular work units that:
- Pass the "one sentence without 'and'" test
- Have clear dependencies mapped
- Can be implemented independently
- Form the basis for spec file generation

This command reads the JTBD document and guides the user through systematic task breakdown, ensuring all tasks are well-defined and dependencies are explicit.

## Scope

### In Scope
- Command file creation in `.claude/commands/project:tasks.md` and `.opencode/commands/project:tasks.md`
- Reading `03-jtbd.md` if it exists
- Interactive guidance for breaking JTBDs into tasks
- Task format: JTBD reference, task ID (NNN-MMM format), description, dependencies
- Granularity validation (one sentence without 'and' test)
- ASCII dependency graph visualization
- Dependency matrix table generation
- Linearized implementation order (waves of parallelizable tasks)
- Writing results to `04-tasks.md`
- Printing next step message

### Out of Scope
- Automatic task generation without user input
- Task estimation or time tracking
- Task assignment to individuals
- Integration with external project management tools
- Validation of technical feasibility
- Code generation or implementation
- Modification of other project files beyond `04-tasks.md`

## Acceptance Criteria

### AC1: Command File Structure
- Command exists at `.claude/commands/project:tasks.md`
- Command exists at `.opencode/commands/project:tasks.md`
- Both files have identical behavior
- YAML frontmatter includes:
  - `description`: Brief description shown in autocomplete
  - `argument-hint`: Shows expected argument format

### AC2: JTBD Document Reading
- Command checks if `projects/$ARGUMENTS/03-jtbd.md` exists
- If missing, warns user but allows them to proceed
- If present, loads and analyzes JTBD content
- Displays current JTBDs to user for context

### AC3: Task Breakdown Guidance
- For each JTBD, prompts user to identify granular tasks
- Enforces task ID format: `NNN-MMM` where NNN is JTBD number, MMM is task number (e.g., `002-004`)
- Each task must include:
  - Task ID
  - Description (one sentence)
  - Dependencies (list of task IDs, or "None")
- Validates granularity using "one sentence without 'and'" heuristic
- Suggests splitting tasks that contain "and" or multiple actions

### AC4: Dependency Graph Generation
- Produces ASCII art dependency graph showing:
  - Tasks grouped by JTBD
  - Arrows showing dependencies
  - Clear visual flow from independent to dependent tasks
- Graph uses box-drawing characters for clarity
- Tasks with no dependencies shown at top/left
- Dependent tasks shown with arrows from their prerequisites

### AC5: Dependency Matrix
- Generates table with columns: Task, Depends On, Blocks
- "Depends On" lists prerequisite tasks (or "-" if none)
- "Blocks" lists tasks that depend on this one
- All task IDs properly formatted and referenced

### AC6: Linearized Implementation Order
- Breaks tasks into "waves" of parallelizable work
- Wave 1: Tasks with no dependencies
- Wave N: Tasks whose dependencies are all in waves 1..N-1
- Each wave clearly labeled
- Tasks within a wave noted as parallelizable

### AC7: File Output
- Creates/updates `projects/<project-name>/04-tasks.md`
- Includes all sections:
  - Task breakdown per JTBD
  - Task summary table
  - Dependency graph (ASCII)
  - Dependency matrix
  - Linearized implementation order
- Preserves existing content if file exists (updates in place)
- File is properly formatted Markdown

### AC8: Next Step Messaging
- After completion, prints: "Next: run `/project:hld <project-name>` for high-level design (optional) or `/project:specs <project-name>` to generate specs"
- Message is clear and actionable
- Includes actual project name in example

## Implementation Notes

### Command Structure
```markdown
---
description: Break JTBDs into granular tasks with dependencies
argument-hint: <project-name>
---

You are helping the user decompose their Jobs to Be Done into atomic tasks.

# Context
The user has defined high-level JTBDs. Your job is to help them:
1. Break each JTBD into granular tasks
2. Identify dependencies between tasks
3. Validate granularity (one sentence without 'and')
4. Generate a dependency graph
5. Create a linearized implementation order

# Project
Project name: $ARGUMENTS
JTBD file: projects/$ARGUMENTS/03-jtbd.md
Output file: projects/$ARGUMENTS/04-tasks.md

# Instructions
[... rest of command prompt ...]
```

### Task ID Format
- Format: `NNN-MMM` where:
  - NNN is zero-padded JTBD number (e.g., 001, 002)
  - MMM is zero-padded task number within that JTBD (e.g., 001, 002)
- Example: Task 002-004 = 4th task under JTBD-002

### Granularity Validation
The "one sentence without 'and'" test:
- Good: "Create project folder structure"
- Good: "Generate template files"
- Bad: "Create folders and generate templates" (should be two tasks)
- Bad: "Implement authentication and authorization" (should be two tasks)

### Dependency Graph Best Practices
- Use box-drawing characters: `┌─┐│└┘├┤┬┴┼─│`
- Group tasks by JTBD for visual clarity
- Use arrows `─►` to show dependencies
- Keep graph readable; if too complex, consider multiple sub-graphs

### Dependency Analysis
When analyzing dependencies, consider:
- **Hard dependencies**: Task B cannot start until Task A is complete
- **Logical dependencies**: Tasks that should be done in order for coherence
- **No false dependencies**: Don't create dependencies just for sequencing; only when truly required

### Linearization Algorithm
```
wave = 1
remaining_tasks = all tasks
completed_tasks = []

while remaining_tasks not empty:
  current_wave = tasks where all dependencies in completed_tasks
  if current_wave is empty:
    ERROR: circular dependency detected

  assign current_wave to wave N
  completed_tasks += current_wave
  remaining_tasks -= current_wave
  wave++
```

### File Format Example
```markdown
# Tasks: <Project Name>

## JTBD-001: <JTBD Title>

### Task 001-001: <Task Description>
**Description**: One sentence describing what this accomplishes.
**Dependencies**: None (or: 001-002, 002-003)
**Acceptance**: How to verify this is complete

## Task Summary

| JTBD | Task Count | Tasks |
|------|------------|-------|
| 001 - Title | 3 | 001-001, 001-002, 001-003 |

## Dependency Graph

[ASCII visualization]

## Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 001-001 | - | 001-002 |

## Linearized Implementation Order

### Wave 1: No dependencies
- 001-001
- 002-001

### Wave 2: Depends on Wave 1
- 001-002 → needs 001-001
```

### Error Handling
- If project folder doesn't exist: Error with suggestion to run `/project:new`
- If JTBD file missing: Warn but continue, suggest user may want to run `/project:jtbd` first
- If circular dependencies detected: Alert user and help them resolve
- If task description contains "and": Suggest splitting into multiple tasks

### Integration Points
- Command must work identically in both Claude Code and OpenCode
- Uses file system paths relative to repo root
- No external dependencies or API calls required
- Pure conversational guidance with file output

## Verification Steps

1. Create test project: `/project:new test-tasks`
2. Create minimal JTBD file with 2 JTBDs
3. Run `/project:tasks test-tasks`
4. Verify command prompts for task breakdown
5. Define 5-6 tasks with dependencies
6. Verify output file `04-tasks.md` contains:
   - All tasks properly formatted
   - Task summary table
   - ASCII dependency graph
   - Dependency matrix
   - Linearized implementation order (multiple waves)
7. Verify next step message is printed
8. Verify command works in both Claude Code and OpenCode

## Dependencies
- None (command is independent)
- Will be used by: 002-007 (prerequisite warnings), 002-008 (next step messaging)

## Related Tasks
- 002-003: Create /project:jtbd command (provides input)
- 002-005: Create /project:hld command (optional next step)
- 002-006: Create /project:specs command (main next step, consumes this output)
- 002-007: Implement prerequisite warning system
- 002-008: Implement "next step" messaging

## Technical Constraints
- Command file must be plain Markdown
- No server-side code execution in command file
- Uses agent's natural language understanding for validation
- File output must be valid Markdown
- ASCII graph must be readable in monospace font

## Success Metrics
- User can break down JTBDs into tasks in single command invocation
- Dependency graph is visually clear and accurate
- Linearized order correctly identifies parallelizable tasks
- Output file is well-formatted and ready for spec generation
- Command feels guided but not restrictive
