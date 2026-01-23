---
description: Guide research capture for a project
argument-hint: <project-name>
---

# Capture Project Research

You are helping the user document research for a project.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If `projects/$1/` doesn't exist, error: "Project '$1' not found. Run `/project:new $1` first."

3. **Check for existing research**:
   - If `projects/$1/01-research.md` exists, ask: "(A)ppend, (R)eplace, or (C)ancel?"
   - Append: Add to end of file
   - Replace: Overwrite entire file
   - Cancel: Stop without changes

4. **Capture research sections** through conversation:
   - **Problem Statement**: What problem are we solving? Why does it matter?
   - **Research Sources**: What existing solutions, docs, or tools did we review?
   - **Constraints**: Technical limitations, business requirements, timeline constraints
   - **Open Questions**: What's still unclear or needs investigation?
   - **Key Decisions** (optional): Any early decisions made during research

5. **Save to** `projects/$1/01-research.md` in markdown format with clear section headers

6. **Print next step**:
```
✓ Research saved to: projects/$1/01-research.md

Next step: Run `/project:prd $1` to create the PRD
```
