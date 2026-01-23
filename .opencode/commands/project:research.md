---
description: Guide research capture for a project
argument-hint: <project-name>
---

# Capture Project Research

You are helping the user document research for a project through conversation.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If `projects/$1/` doesn't exist, error: "Project '$1' not found. Run `/project:new $1` first."

3. **Check for existing research**:
   - If `projects/$1/01-research.md` exists, read it first and ask: "(A)ppend, (R)eplace, or (C)ancel?"
   - Append: Continue conversation, add to end
   - Replace: Start fresh, overwrite entire file
   - Cancel: Stop without changes

4. **CONVERSATE FIRST, WRITE LAST**:
   - Ask questions to gather information
   - Discuss findings and implications
   - Only write the file after all questions are resolved
   - Do NOT write a file immediately when the command is called

5. **Capture research sections** through conversation:
   - **Problem Statement**: What problem are we solving? Why does it matter?
   - **Research Sources**: What existing solutions, docs, or tools did we review?
   - **Constraints**: Technical limitations, business requirements, timeline constraints
   - **Open Questions**: What's still unclear or needs investigation?
   - **Key Decisions** (optional): Any early decisions made during research

6. **Save to** `projects/$1/01-research.md` in markdown format with clear section headers
   - This is the FINAL step, after conversation is complete

7. **Print next step**:
```
✓ Research saved to: projects/$1/01-research.md

Next step: Run `/project:prd $1` to create the PRD
```
