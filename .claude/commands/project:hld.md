---
description: Document high-level design for a project
argument-hint: <project-name>
---

# Create High-Level Design (Optional)

You are helping the user document high-level design decisions.

**Note**: This step is optional. You can skip to `/project:specs` if architectural decisions are straightforward.

## Instructions

1. **Get project name**: Use $1 as the project name. If missing, ask the user.

2. **Validate project exists**:
   - If `projects/$1/` doesn't exist, error: "Project '$1' not found. Run `/project:new $1` first."

3. **Check prerequisites**:
   - Read `projects/$1/03-jtbd.md` and `projects/$1/04-tasks.md` for context
   - Warn if either is missing, allow proceeding

4. **Check for existing HLD**:
   - If `projects/$1/05-hld.md` exists, ask: "(A)ppend, (R)eplace, or (C)ancel?"

5. **Capture HLD sections**:
   - **Overview**: Brief architecture summary
   - **Components**: Major system components and their responsibilities
   - **Data Flow**: How data moves through the system
   - **Interfaces**: APIs, contracts between components
   - **Technical Decisions**: Technology choices, patterns, trade-offs (with rationale)
   - **Dependencies**: External libraries, services, frameworks
   - **Open Questions**: Unresolved architectural concerns

6. **Link to JTBDs/Tasks**: Reference which components support which JTBDs

7. **Save to** `projects/$1/05-hld.md`

8. **Print next step**:
```
✓ HLD saved to: projects/$1/05-hld.md

Next step: Run `/project:specs $1` to generate spec files
```
