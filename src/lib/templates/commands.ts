/**
 * Command templates for project workflow
 * These commands guide users through the project planning process
 */

export const PROJECT_NEW_COMMAND = `---
description: Create a new project with organized folder structure
argument-hint: <project-name>
---

# Create New Project

You are helping the user create a new project folder for ralphctl.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user for it.

2. **Validate project name**:
   - Must be alphanumeric with optional hyphens and underscores
   - No spaces, special characters, or leading/trailing hyphens
   - Examples: \`auth-system\`, \`user_profiles\`, \`api-v2\`

3. **Check if project exists**:
   - If \`projects/$1/\` already exists, error and stop
   - Message: "Project '$1' already exists. Choose a different name or delete the existing project."

4. **Create folder structure**:
   - \`projects/$1/\`
   - \`projects/$1/specs/\`

5. **Generate template files** in \`projects/$1/\`:
   - \`01-research.md\` - Research template with sections for problem statement, existing solutions, constraints, open questions
   - \`02-prd.md\` - PRD template with sections for overview, goals, non-goals, user stories
   - \`03-jtbd.md\` - JTBD template with placeholder for high-level jobs
   - \`04-tasks.md\` - Tasks template with placeholder for granular tasks
   - \`05-hld.md\` - HLD template with sections for architecture, components, data flow
   - \`IMPLEMENTATION_PLAN.md\` - Empty implementation plan

6. **Print success message**:
\`\`\`
✓ Created project: $1

Folder structure:
  projects/$1/
  ├── specs/
  ├── 01-research.md
  ├── 02-prd.md
  ├── 03-jtbd.md
  ├── 04-tasks.md
  ├── 05-hld.md
  └── IMPLEMENTATION_PLAN.md

Next step: Run \`/project:research $1\` to start capturing research
\`\`\`
`;

export const PROJECT_RESEARCH_COMMAND = `---
description: Guide research capture for a project
argument-hint: <project-name>
---

# Capture Project Research

You are helping the user document research for a project.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If \`projects/$1/\` doesn't exist, error: "Project '$1' not found. Run \`/project:new $1\` first."

3. **Check for existing research**:
   - If \`projects/$1/01-research.md\` exists, ask: "(A)ppend, (R)eplace, or (C)ancel?"
   - Append: Add to end of file
   - Replace: Overwrite entire file
   - Cancel: Stop without changes

4. **Capture research sections** through conversation:
   - **Problem Statement**: What problem are we solving? Why does it matter?
   - **Research Sources**: What existing solutions, docs, or tools did we review?
   - **Constraints**: Technical limitations, business requirements, timeline constraints
   - **Open Questions**: What's still unclear or needs investigation?
   - **Key Decisions** (optional): Any early decisions made during research

5. **Save to** \`projects/$1/01-research.md\` in markdown format with clear section headers

6. **Print next step**:
\`\`\`
✓ Research saved to: projects/$1/01-research.md

Next step: Run \`/project:prd $1\` to create the PRD
\`\`\`
`;

export const PROJECT_PRD_COMMAND = `---
description: Create or update a PRD for a project
argument-hint: <project-name>
---

# Create Product Requirements Document

You are helping the user create a PRD (Product Requirements Document).

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If \`projects/$1/\` doesn't exist, error: "Project '$1' not found. Run \`/project:new $1\` first."

3. **Check prerequisites**:
   - If \`projects/$1/01-research.md\` exists, read it for context
   - If missing, warn: "Research file not found. It's recommended to run \`/project:research $1\` first, but you can proceed without it."

4. **Check for existing PRD**:
   - If \`projects/$1/02-prd.md\` exists, ask: "(A)ppend, (R)eplace, or (C)ancel?"

5. **Capture PRD sections** through conversation:
   - **Overview**: Brief description of what we're building
   - **Goals**: Numbered list of what we want to achieve
   - **Non-Goals**: Numbered list of what we're explicitly NOT doing
   - **User Stories**: Format as "As a [role], I want [action], so that [benefit]"
     - Each story MUST have acceptance criteria (bullet points)
     - Minimum 1 user story required
     - Validate completeness before saving

6. **Validate before saving**:
   - At least 1 goal exists
   - At least 1 user story with acceptance criteria
   - No empty sections

7. **Save to** \`projects/$1/02-prd.md\`

8. **Print next step**:
\`\`\`
✓ PRD saved to: projects/$1/02-prd.md

Next step: Run \`/project:jtbd $1\` to break down into Jobs to Be Done
\`\`\`
`;

export const PROJECT_JTBD_COMMAND = `---
description: Break PRD into high-level Jobs to Be Done
argument-hint: <project-name>
---

# Create Jobs to Be Done (JTBD)

You are helping the user break down the PRD into 2-5 high-level jobs.

## What is a JTBD?

A "Job to Be Done" is a high-level user capability or goal. It's more granular than the overall project goal, but less granular than implementation tasks.

**Example**: For an auth system project:
- JTBD-001: User Registration and Account Creation
- JTBD-002: Secure Authentication and Session Management
- JTBD-003: Authorization and Permission Control

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If \`projects/$1/\` doesn't exist, error: "Project '$1' not found. Run \`/project:new $1\` first."

3. **Check prerequisites**:
   - If \`projects/$1/02-prd.md\` exists, read it to suggest JTBDs
   - If missing, warn but allow proceeding

4. **Check for existing JTBD file**:
   - If \`projects/$1/03-jtbd.md\` exists, ask: "(A)ppend, (R)eplace, or (C)ancel?"

5. **Guide JTBD creation**:
   - Suggest 2-5 JTBDs based on PRD goals
   - For each JTBD capture:
     - **JTBD-NNN**: Title (sequential numbering: 001, 002, etc.)
     - **Job Statement**: "When [situation], I want [motivation], so that [outcome]"
     - **Context**: Background, constraints, scope
     - **Success Criteria**: Measurable outcomes for this job

6. **Validate JTBDs**:
   - Each JTBD should be distinct and non-overlapping
   - Each should pass the "one job without 'and'" test (not too broad)
   - Should map back to PRD goals

7. **Save to** \`projects/$1/03-jtbd.md\` with numbered sections

8. **Print next step**:
\`\`\`
✓ JTBD saved to: projects/$1/03-jtbd.md

Next step: Run \`/project:tasks $1\` to break JTBDs into granular tasks
\`\`\`
`;

export const PROJECT_TASKS_COMMAND = `---
description: Break JTBDs into granular tasks with dependencies
argument-hint: <project-name>
---

# Create Task Breakdown

You are helping the user decompose JTBDs into granular, implementable tasks.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If \`projects/$1/\` doesn't exist, error: "Project '$1' not found. Run \`/project:new $1\` first."

3. **Check prerequisites**:
   - Read \`projects/$1/03-jtbd.md\` (error if missing)
   - Parse JTBD numbering (JTBD-001, JTBD-002, etc.)

4. **For each JTBD, create tasks**:
   - **Task ID format**: \`NNN-MMM\` where NNN=JTBD number, MMM=task number
     - Example: JTBD-001 → tasks 001-001, 001-002, 001-003
   - **Task description**: One sentence without 'and' (enforce granularity)
   - **Dependencies**: List task IDs this depends on, or "None"

5. **Validate tasks**:
   - Task IDs follow format \`NNN-MMM\`
   - Descriptions are single, clear sentences
   - Dependencies reference valid task IDs
   - No circular dependencies

6. **Generate three outputs**:

   **A. ASCII Dependency Graph**:
   \`\`\`
   001-001 ──┐
             ├──> 001-003
   001-002 ──┘
   \`\`\`

   **B. Dependency Matrix Table**:
   | Task ID | Description | Depends On | Blocks |
   |---------|-------------|------------|--------|
   | 001-001 | Task desc   | None       | 001-003 |

   **C. Linearized Implementation Order** (waves of parallel work):
   \`\`\`
   Wave 1: 001-001, 001-002 (no dependencies)
   Wave 2: 001-003 (depends on Wave 1)
   Wave 3: 002-001, 002-002
   \`\`\`

7. **Save to** \`projects/$1/04-tasks.md\` with all three outputs

8. **Print next step**:
\`\`\`
✓ Tasks saved to: projects/$1/04-tasks.md

Next step options:
  - Run \`/project:hld $1\` for high-level design (optional)
  - Run \`/project:specs $1\` to generate spec files (required)
\`\`\`
`;

export const PROJECT_HLD_COMMAND = `---
description: Document high-level design for a project
argument-hint: <project-name>
---

# Create High-Level Design (Optional)

You are helping the user document high-level design decisions.

**Note**: This step is optional. You can skip to \`/project:specs\` if architectural decisions are straightforward.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If \`projects/$1/\` doesn't exist, error: "Project '$1' not found. Run \`/project:new $1\` first."

3. **Check prerequisites**:
   - Read \`projects/$1/03-jtbd.md\` and \`projects/$1/04-tasks.md\` for context
   - Warn if either is missing, allow proceeding

4. **Check for existing HLD**:
   - If \`projects/$1/05-hld.md\` exists, ask: "(A)ppend, (R)eplace, or (C)ancel?"

5. **Capture HLD sections**:
   - **Overview**: Brief architecture summary
   - **Components**: Major system components and their responsibilities
   - **Data Flow**: How data moves through the system
   - **Interfaces**: APIs, contracts between components
   - **Technical Decisions**: Technology choices, patterns, trade-offs (with rationale)
   - **Dependencies**: External libraries, services, frameworks
   - **Open Questions**: Unresolved architectural concerns

6. **Link to JTBDs/Tasks**: Reference which components support which JTBDs

7. **Save to** \`projects/$1/05-hld.md\`

8. **Print next step**:
\`\`\`
✓ HLD saved to: projects/$1/05-hld.md

Next step: Run \`/project:specs $1\` to generate spec files
\`\`\`
`;

export const PROJECT_SPECS_COMMAND = `---
description: Generate spec files from task breakdown
argument-hint: <project-name>
---

# Generate Spec Files

You are generating individual spec files for each task using isolated subagents.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If \`projects/$1/\` doesn't exist, error: "Project '$1' not found. Run \`/project:new $1\` first."

3. **Check prerequisites**:
   - Read \`projects/$1/04-tasks.md\` (error if missing: "Tasks file required. Run \`/project:tasks $1\` first.")
   - Check for \`projects/$1/03-jtbd.md\` (warn if missing but allow proceeding with confirmation)

4. **Parse tasks**:
   - Extract all task IDs (format: \`NNN-MMM\`)
   - Extract task descriptions
   - Extract dependencies

5. **For each task, spawn isolated subagent** (Sonnet model):
   - **Critical**: Subagent reads ONLY from filesystem artifacts (01-research.md, 02-prd.md, 03-jtbd.md, 04-tasks.md, 05-hld.md if present)
   - **No conversation context** - validates artifacts are complete
   - Generate spec file with:
     - Task ID and JTBD reference
     - Purpose (what this accomplishes)
     - Scope (in/out of scope)
     - Acceptance criteria (verification steps)
     - Implementation notes (technical guidance)
     - Dependencies (from task breakdown)

6. **Create spec files**:
   - Save to \`projects/$1/specs/jtbd-NNN-task-MMM.md\`
   - Show progress: "Generating spec N/TOTAL..."
   - Continue on error (log failed specs)

7. **Create/update IMPLEMENTATION_PLAN.md**:
   - List all tasks in wave order
   - Mark status (Pending/In Progress/Complete)
   - Include dependencies and blocks

8. **Print completion**:
\`\`\`
✓ Generated X specs in: projects/$1/specs/
✓ Created/updated: projects/$1/IMPLEMENTATION_PLAN.md

Next step: Run \`ralphctl run plan --project $1\` to start implementation
\`\`\`
`;

/**
 * List of all command files with their names
 */
export const COMMAND_FILES = [
  { name: "project:new.md", content: PROJECT_NEW_COMMAND },
  { name: "project:research.md", content: PROJECT_RESEARCH_COMMAND },
  { name: "project:prd.md", content: PROJECT_PRD_COMMAND },
  { name: "project:jtbd.md", content: PROJECT_JTBD_COMMAND },
  { name: "project:tasks.md", content: PROJECT_TASKS_COMMAND },
  { name: "project:hld.md", content: PROJECT_HLD_COMMAND },
  { name: "project:specs.md", content: PROJECT_SPECS_COMMAND },
] as const;
