---
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
   - Examples: `auth-system`, `user_profiles`, `api-v2`

3. **Check if project exists**:
   - If `projects/$1/` already exists, error and stop
   - Message: "Project '$1' already exists. Choose a different name or delete the existing project."

4. **Create folder structure**:
   - `projects/$1/`
   - `projects/$1/specs/`

5. **Generate template files** in `projects/$1/`:
   - `01-research.md` - Research template with sections for problem statement, existing solutions, constraints, open questions
   - `02-prd.md` - PRD template with sections for overview, goals, non-goals, user stories
   - `03-jtbd.md` - JTBD template with placeholder for high-level jobs
   - `04-tasks.md` - Tasks template with placeholder for granular tasks
   - `05-hld.md` - HLD template with sections for architecture, components, data flow
   - `IMPLEMENTATION_PLAN.md` - Empty implementation plan

6. **Print success message**:
```
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

Next step: Run `/project:research $1` to start capturing research
```
