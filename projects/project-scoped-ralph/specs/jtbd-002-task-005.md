# Spec: Create /project:hld Command

**Task ID**: 002-005
**JTBD**: JTBD-002 (Guided Planning Workflow)
**Dependencies**: None

---

## Purpose

Provide a guided conversational command that helps users document high-level design decisions for their project. This is an optional stage between task breakdown and spec generation, allowing users to think through architecture, components, data flow, and technical decisions before implementation begins.

**Critical behavior**: The command is "conversational-first, write-last". The agent should engage in discussion with the user about design decisions, explore architecture - and ONLY write the `05-hld.md` file as the FINAL step after all questions are resolved. The file must NOT be written immediately when the command is invoked.

---

## Scope

### In Scope
- Command file at `.claude/commands/project:hld.md` and `.opencode/commands/project:hld.md`
- Interactive prompts for HLD sections: components, data flow, interfaces, tech decisions
- Reading prerequisite files (03-jtbd.md, 04-tasks.md) if they exist
- Writing/updating `projects/<name>/05-hld.md`
- Linking HLD back to JTBDs and tasks
- Clear "next step" messaging after completion
- Warning if prerequisite files (PRD, JTBD, Tasks) are missing, but allowing user to proceed

### Out of Scope
- Automatic architecture generation or suggestions
- Validation of technical feasibility
- Integration with external architecture tools (Mermaid, PlantUML, etc.)
- Code generation from HLD
- HLD versioning or history tracking

---

## Acceptance Criteria

### 1. Command File Structure
- [ ] Command exists at `.claude/commands/project:hld.md`
- [ ] Command exists at `.opencode/commands/project:hld.md`
- [ ] Both files have identical content (behavior consistency)
- [ ] YAML frontmatter includes:
  - `description`: "Guide user through high-level design documentation"
  - `argument-hint`: "<project-name>"

### 2. Project Name Handling
- [ ] Command accepts project name as `$1` argument
- [ ] If no argument provided, prompts user for project name
- [ ] Validates that `projects/<name>/` folder exists
- [ ] If folder doesn't exist, shows error and suggests running `/project:new <name>` first

### 3. Prerequisite Checking
- [ ] Checks if `projects/<name>/02-prd.md` exists
- [ ] Checks if `projects/<name>/03-jtbd.md` exists
- [ ] Checks if `projects/<name>/04-tasks.md` exists
- [ ] If any prerequisite is missing:
  - Warns user that previous stages are recommended
  - Lists which files are missing
  - Asks for confirmation to proceed anyway
  - Allows user to continue if they confirm

### 4. HLD Template Structure
- [ ] Creates/updates `projects/<name>/05-hld.md` with sections:
  - **Overview**: Brief architecture summary
  - **Components**: Major system components and their responsibilities
  - **Data Flow**: How data moves through the system
  - **Interfaces**: Key interfaces, APIs, contracts between components
  - **Technical Decisions**: Technology choices, patterns, trade-offs
  - **Dependencies**: External libraries, services, or systems
  - **Open Questions**: Unresolved architectural concerns

### 5. Guided Conversation Flow
- [ ] Agent prompts for each HLD section in sequence
- [ ] Agent reads PRD/JTBD/Tasks files if present to provide context
- [ ] Agent suggests architecture patterns based on tasks (if available)
- [ ] Agent asks clarifying questions about component boundaries
- [ ] Agent captures technical trade-offs and rationale
- [ ] Agent links components back to relevant JTBDs/tasks

### 6. File Writing
- [ ] Saves content to `projects/<name>/05-hld.md`
- [ ] Preserves existing content if file already exists (append/update mode)
- [ ] Uses clear markdown formatting with proper headings
- [ ] Includes links to related JTBDs/tasks where applicable

### 7. Next Step Messaging
- [ ] After completion, prints:
  ```
  ✓ High-level design documented at projects/<name>/05-hld.md

  Next: Run `/project:specs <name>` to generate spec files for each task.
  ```

### 8. Error Handling
- [ ] Handles missing project folder gracefully
- [ ] Handles file write permissions errors
- [ ] Provides clear error messages with recovery instructions

---

## Implementation Notes

### Command File Location
Create two identical command files:
- `.claude/commands/project:hld.md`
- `.opencode/commands/project:hld.md`

### YAML Frontmatter
```yaml
---
description: Guide user through high-level design documentation
argument-hint: <project-name>
---
```

### Command Content Structure

```markdown
You are helping the user create a high-level design (HLD) document for their project.

PROJECT_NAME: $1

## Your Task

1. **Validate Project**: Check if `projects/$1/` folder exists
   - If not, tell user to run `/project:new $1` first and exit

2. **Check Prerequisites** (warn but don't block):
   - Check for `projects/$1/02-prd.md`
   - Check for `projects/$1/03-jtbd.md`
   - Check for `projects/$1/04-tasks.md`
   - If any are missing, warn user and ask if they want to proceed

3. **Read Context** (if files exist):
   - Read PRD to understand requirements
   - Read JTBD to understand high-level goals
   - Read Tasks to understand implementation breakdown

4. **Guide HLD Creation**: Help user document these sections in `projects/$1/05-hld.md`:

   ### Overview
   - Brief architecture summary (2-3 sentences)
   - Key architectural patterns being used

   ### Components
   - List major system components
   - Describe each component's responsibility
   - Note component boundaries and interactions

   ### Data Flow
   - Describe how data moves through the system
   - Note key data transformations
   - Identify data storage points

   ### Interfaces
   - Key APIs or contracts between components
   - External interfaces (user-facing, third-party)
   - Data formats and protocols

   ### Technical Decisions
   - Technology choices (languages, frameworks, libraries)
   - Architectural patterns and why
   - Trade-offs made and rationale

   ### Dependencies
   - External libraries or packages
   - Third-party services
   - System dependencies

   ### Open Questions
   - Unresolved architectural concerns
   - Areas needing more research
   - Alternative approaches being considered

5. **Link to Tasks**: Reference specific task IDs from `04-tasks.md` where relevant

6. **Save File**: Write to `projects/$1/05-hld.md`

7. **Print Next Step**:
   ```
   ✓ High-level design documented at projects/$1/05-hld.md

   Next: Run `/project:specs $1` to generate spec files for each task.
   ```

## Important Notes

- HLD is **optional** - some projects may not need it
- Focus on **decisions and rationale**, not implementation details
- Keep it high-level - detailed specs come later
- Link components back to JTBDs/tasks when possible
- Capture **why** decisions were made, not just **what**
```

### File Path Variables
Use `$1` for project name parameter throughout the command file. This works in both Claude Code and OpenCode.

### Prerequisite Warning Pattern
```markdown
⚠️  Recommended files not found:
- projects/<name>/02-prd.md
- projects/<name>/03-jtbd.md
- projects/<name>/04-tasks.md

HLD is most useful after defining requirements and tasks.
Do you want to continue anyway? (yes/no)
```

### HLD Section Guidance

**Components**: Guide user to think about:
- What are the major pieces of the system?
- What is each piece responsible for?
- How do they interact?

**Data Flow**: Guide user to think about:
- Where does data enter the system?
- How is it transformed?
- Where is it stored or sent?

**Technical Decisions**: Guide user to capture:
- Why this framework over alternatives?
- What patterns are we using (MVC, microservices, etc.)?
- What trade-offs did we make?

### Context Usage
If prerequisite files exist:
- Parse JTBD list to suggest component boundaries
- Parse Tasks to identify technical concerns
- Reference user stories from PRD when discussing interfaces

### Linking Pattern
When writing HLD, reference tasks like:
```markdown
## Components

### Authentication Service
Responsible for: JTBD-001 (User Authentication)
Implements tasks: 001-001, 001-002, 001-003
```

---

## Verification Steps

### Manual Testing
1. Run `/project:hld test-project` with no existing project
   - Verify error message appears
   - Verify suggests running `/project:new`

2. Create project with `/project:new test-project`
   - Run `/project:hld test-project` with no PRD/JTBD/Tasks
   - Verify warning appears
   - Verify can proceed anyway

3. Create PRD, JTBD, and Tasks files
   - Run `/project:hld test-project`
   - Verify agent reads context files
   - Verify agent prompts for each HLD section
   - Verify file is created at `projects/test-project/05-hld.md`

4. Run `/project:hld test-project` again on existing HLD
   - Verify preserves existing content
   - Verify allows updates/additions

5. Verify "next step" message prints after completion

### Integration Testing
1. Complete full workflow:
   - `/project:new` → `/project:research` → `/project:prd` → `/project:jtbd` → `/project:tasks` → `/project:hld`
2. Verify HLD references JTBDs and tasks correctly
3. Verify file structure is correct
4. Verify next command (`/project:specs`) works after HLD completion

### Cross-Tool Testing
1. Test command in Claude Code
2. Test identical command in OpenCode
3. Verify behavior is consistent

---

## Related Tasks

- **002-007** (Prerequisite warning system): Implements the warning logic used by this command
- **002-008** (Next step messaging): Implements the next step output used by this command
- **002-004** (Tasks command): Produces the tasks file that HLD should reference
- **002-006** (Specs command): The next command in the workflow after HLD

---

## Notes from Planning Documents

From **02-prd.md** (US-5):
> Command that guides user through high-level design: components, data flow, interfaces, tech decisions. Links back to JTBDs and tasks.

From **03-jtbd.md** (JTBD-002):
> Sub-job: HLD documentation (optional architecture decisions)

From **04-tasks.md** (Task 002-005):
> Command that guides user through high-level design: components, data flow, interfaces, tech decisions. Saves to `05-hld.md`.

**Key insight**: HLD is explicitly optional. Some projects need it (complex architecture), others don't (simple features). The command should make this clear and not pressure users to fill it out if unnecessary.
