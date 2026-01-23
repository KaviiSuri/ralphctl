# Spec: Create /project:jtbd Command

**Task ID**: 002-003
**JTBD**: JTBD-002 (Guided Planning Workflow)
**Dependencies**: None

---

## Purpose

Create a command that analyzes the PRD and helps the user break it into high-level "Jobs to Be Done" (JTBDs). Each JTBD represents a distinct user goal or major capability area. The command saves the output to `03-jtbd.md` and prints the next step.

---

## Scope

### In Scope
- Command file creation at `.claude/commands/project:jtbd.md` and `.opencode/commands/project:jtbd.md`
- YAML frontmatter with description and argument hints
- Reading `02-prd.md` if it exists to inform JTBD suggestions
- Interactive conversation to help user identify JTBDs
- JTBD numbering format: JTBD-001, JTBD-002, etc.
- Structure: Job Statement, Context, Success Criteria for each JTBD
- Saving output to `projects/<name>/03-jtbd.md`
- Printing next step message: "Run `/project:tasks <name>` to break JTBDs into granular tasks"
- Warning if `02-prd.md` is missing (but allowing user to proceed)

### Out of Scope
- Automatic JTBD generation without user input
- Validation that JTBDs are "correct"
- Task breakdown (that's Task 002-004)
- Spec generation (that's Task 002-006)
- Integration with ralphctl CLI flags (this is a standalone command)

---

## Acceptance Criteria

### AC-1: Command File Structure
- [ ] File exists at `.claude/commands/project:jtbd.md`
- [ ] File exists at `.opencode/commands/project:jtbd.md`
- [ ] Both files have identical content
- [ ] YAML frontmatter includes:
  - `description: "Break PRD into high-level Jobs to Be Done"`
  - `argument-hint: "<project-name>"`

### AC-2: PRD Analysis
- [ ] Command checks if `projects/<name>/02-prd.md` exists
- [ ] If PRD exists, reads its contents to inform suggestions
- [ ] If PRD missing, shows warning: "Warning: 02-prd.md not found. You can proceed but may want to run `/project:prd <name>` first."
- [ ] User can proceed even if PRD is missing

### AC-3: JTBD Guidance
- [ ] Command explains what JTBDs are (high-level user goals/capabilities)
- [ ] Provides examples based on PRD content (if available)
- [ ] Suggests typical JTBD structure:
  - Job Statement: "When [situation], I want [motivation], so that [outcome]"
  - Context: Background and constraints
  - Success Criteria: What defines success for this job
- [ ] Prompts user to identify 2-5 distinct jobs
- [ ] Helps user verify JTBDs are at the right level (not too granular, not too broad)

### AC-4: JTBD Numbering
- [ ] JTBDs are numbered sequentially: JTBD-001, JTBD-002, JTBD-003, etc.
- [ ] Numbering starts at 001 and uses zero-padding (3 digits)
- [ ] Each JTBD has a clear title/name

### AC-5: File Output
- [ ] Creates/updates `projects/<name>/03-jtbd.md`
- [ ] File includes:
  - Title: "Jobs to Be Done: <project-name>"
  - Section per JTBD with numbering
  - Job Statement, Context, Success Criteria for each
  - Optional: Sub-jobs if a JTBD is complex
  - Footer with next step message
- [ ] File is formatted as clean markdown

### AC-6: Next Step Messaging
- [ ] After saving file, command prints: "Next: run `/project:tasks <name>` to break JTBDs into granular tasks"
- [ ] Message is clear and actionable

### AC-7: Argument Handling
- [ ] Command accepts `$ARGUMENTS` or `$1` as project name
- [ ] If no project name provided, prompts user for it
- [ ] Validates that `projects/<name>/` directory exists
- [ ] If directory doesn't exist, suggests running `/project:new <name>` first

---

## Implementation Notes

### Command Template Structure

```markdown
---
description: "Break PRD into high-level Jobs to Be Done"
argument-hint: "<project-name>"
---

You are helping the user identify high-level "Jobs to Be Done" for their project.

**Arguments**: $ARGUMENTS (project name)

## Instructions

1. Parse project name from $ARGUMENTS (or prompt if missing)
2. Verify `projects/<name>/` exists (error if not)
3. Check for `projects/<name>/02-prd.md`:
   - If exists: Read and analyze for JTBD suggestions
   - If missing: Warn but allow proceeding
4. Explain JTBDs (high-level user goals, distinct capability areas)
5. Guide conversation to identify 2-5 JTBDs
6. For each JTBD help user write:
   - JTBD-NNN: Title
   - Job Statement (When/I want/So that format)
   - Context (background, constraints)
   - Success Criteria (what defines success)
7. Save to `projects/<name>/03-jtbd.md`
8. Print: "Next: run `/project:tasks <name>` to break JTBDs into granular tasks"

## JTBD Examples (from PRD context)

[If PRD exists, suggest 2-3 potential JTBDs based on user stories and goals]

## JTBD Structure Template

```markdown
## JTBD-001: <Title>

**Job Statement**: When [situation], I want [motivation], so that [outcome].

**Context**:
- Background
- Constraints
- User needs

**Success Criteria**:
- Measurable outcome 1
- Measurable outcome 2
```

## Verification

- Each JTBD is a distinct high-level goal
- JTBDs don't overlap significantly
- All PRD goals are covered by at least one JTBD
- JTBDs are not too granular (that's what tasks are for)
```

### File Naming Convention
- Use lowercase with colon separator: `project:jtbd.md`
- Same name for both Claude Code and OpenCode

### PRD Reading Pattern
```markdown
@projects/$1/02-prd.md
```
This includes the PRD content if it exists (file reference in command body).

### Error Messages
- Project not found: "Error: `projects/<name>/` does not exist. Run `/project:new <name>` first."
- No project name: "Please provide a project name: `/project:jtbd <name>`"

### JTBD Quality Checks
Help user verify:
1. Each JTBD passes "one job without 'and'" test
2. JTBDs are at the right abstraction level (not tasks)
3. JTBDs are outcome-focused, not implementation-focused
4. All PRD user stories map to at least one JTBD

### Integration with Other Commands
- Prerequisite: `/project:prd` (soft warning if missing)
- Next step: `/project:tasks` (prints this after completion)
- Creates input for Task 002-004 (task breakdown command)

---

## Testing Checklist

### Manual Testing
- [ ] Run `/project:jtbd test-project` with no PRD → shows warning, allows proceeding
- [ ] Run `/project:jtbd test-project` with existing PRD → reads PRD, suggests JTBDs
- [ ] Run `/project:jtbd` with no args → prompts for project name
- [ ] Run `/project:jtbd nonexistent` → shows error about missing project
- [ ] Verify file saved to correct location: `projects/test-project/03-jtbd.md`
- [ ] Verify file has correct structure and formatting
- [ ] Verify next step message is printed
- [ ] Test in both Claude Code and OpenCode (if available)

### Content Verification
- [ ] JTBDs are numbered correctly (001, 002, 003...)
- [ ] Each JTBD has Job Statement, Context, Success Criteria
- [ ] JTBDs are distinct and non-overlapping
- [ ] JTBDs are at appropriate abstraction level
- [ ] File is valid markdown

---

## Related Tasks
- **Task 002-002**: Create /project:prd command (provides input for this command)
- **Task 002-004**: Create /project:tasks command (uses output from this command)
- **Task 002-007**: Implement prerequisite warning system (this command implements the warning pattern)
- **Task 002-008**: Implement "next step" messaging (this command implements the messaging pattern)

---

## References
- Research document: `01-research.md` (JTBD philosophy, Geoffrey Huntley's approach)
- PRD: `02-prd.md` (User Story US-4 for this command)
- Tasks breakdown: `04-tasks.md` (Task 002-003 definition)
