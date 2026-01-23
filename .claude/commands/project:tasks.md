---
description: Break JTBDs into granular tasks with dependencies
argument-hint: <project-name>
---

# Create Task Breakdown

You are helping the user decompose JTBDs into granular, implementable tasks.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If `projects/$1/` doesn't exist, error: "Project '$1' not found. Run `/project:new $1` first."

3. **Check prerequisites**:
   - Read `projects/$1/03-jtbd.md` (error if missing)
   - Parse JTBD numbering (JTBD-001, JTBD-002, etc.)

4. **For each JTBD, create tasks**:
   - **Task ID format**: `NNN-MMM` where NNN=JTBD number, MMM=task number
     - Example: JTBD-001 → tasks 001-001, 001-002, 001-003
   - **Task description**: One sentence without 'and' (enforce granularity)
   - **Dependencies**: List task IDs this depends on, or "None"

5. **Validate tasks**:
   - Task IDs follow format `NNN-MMM`
   - Descriptions are single, clear sentences
   - Dependencies reference valid task IDs
   - No circular dependencies

6. **Generate three outputs**:

   **A. ASCII Dependency Graph**:
   ```
   001-001 ──┐
             ├──> 001-003
   001-002 ──┘
   ```

   **B. Dependency Matrix Table**:
   | Task ID | Description | Depends On | Blocks |
   |---------|-------------|------------|--------|
   | 001-001 | Task desc   | None       | 001-003 |

   **C. Linearized Implementation Order** (waves of parallel work):
   ```
   Wave 1: 001-001, 001-002 (no dependencies)
   Wave 2: 001-003 (depends on Wave 1)
   Wave 3: 002-001, 002-002
   ```

7. **Save to** `projects/$1/04-tasks.md` with all three outputs

8. **Print next step**:
```
✓ Tasks saved to: projects/$1/04-tasks.md

Next step options:
  - Run `/project:hld $1` for high-level design (optional)
  - Run `/project:specs $1` to generate spec files (required)
```
