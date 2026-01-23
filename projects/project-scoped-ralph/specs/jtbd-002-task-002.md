# Spec: Create /project:prd Command

**Task ID**: 002-002
**JTBD**: JTBD-002 (Guided Planning Workflow)
**Dependencies**: None

---

## Purpose

Create a Claude Code and OpenCode command (`/project:prd <project-name>`) that guides users through creating a Product Requirements Document (PRD) for their project.

**Critical behavior**: The command is "conversational-first, write-last". The agent should engage in discussion with the user, ask questions about goals and user stories, explore the requirements - and ONLY write the `02-prd.md` file as the FINAL step after all questions are resolved. The file must NOT be written immediately when the command is invoked.

---

## Scope

### In Scope
- Command file creation in `.claude/commands/project:prd.md` and `.opencode/commands/project:prd.md`
- Interactive conversation to gather PRD sections
- Validation that PRD has minimum required content (goals, at least one user story)
- Writing/updating `projects/<project-name>/02-prd.md`
- Reading from `01-research.md` if it exists (to inform PRD creation)
- Warning if `01-research.md` doesn't exist (but allow user to proceed)
- Printing next step message: "Run `/project:jtbd <project-name>` to break into jobs to be done"

### Out of Scope
- Creating the project folder structure (handled by Task 001-001)
- Hard blocking if research file missing (just warn)
- Automatic progression to next stage
- PRD templates or industry-specific formats
- Integration with external tools (Jira, Linear, etc.)
- Multi-user collaboration features

---

## Acceptance Criteria

### 1. Command File Exists
- File exists at `.claude/commands/project:prd.md`
- File exists at `.opencode/commands/project:prd.md`
- Both files have identical content (same prompts and behavior)

### 2. Command Accepts Project Name
- Command takes project name as argument: `/project:prd <project-name>`
- If no project name provided, prompts user for it
- Validates project folder exists at `projects/<project-name>/`
- If folder doesn't exist, shows error and suggests running `/project:new <project-name>` first

### 3. Prerequisite Check
- Checks if `projects/<project-name>/01-research.md` exists
- If missing: displays warning "Research file not found. It's recommended to run `/project:research <project-name>` first, but you can proceed without it."
- Allows user to continue or abort

### 4. PRD Section Prompts
The command guides the user through these sections:

**Overview**
- Brief description of what this project is about

**Goals**
- What this project aims to achieve
- Numbered list format

**Non-Goals**
- What is explicitly out of scope
- Numbered list format

**User Stories**
- Format: "As a [role], I want to [action], so that [benefit]"
- Each story must include acceptance criteria
- Minimum: 1 user story required
- Command should prompt for additional stories

### 5. PRD Content Integration
- If `01-research.md` exists, the command should read it and use context to suggest relevant PRD sections
- Example: research mentions "authentication" → suggest user story about login

### 6. Conversational-First, Write-Last Behavior
- Agent engages in conversation BEFORE writing any file
- Asks questions about goals, non-goals, user stories
- Discusses and refines requirements
- ONLY writes `02-prd.md` after conversation is complete
- File is NOT written immediately when command is invoked

### 7. PRD Validation
Before saving, validate:
- Goals section is not empty
- At least one user story exists
- Each user story has acceptance criteria
- If validation fails, prompt user to add missing content

### 8. File Writing
- Writes content to `projects/<project-name>/02-prd.md` as the FINAL step
- If file already exists, READ IT FIRST then prompts user: "PRD file already exists. Overwrite or append?"
- Uses markdown format with clear heading structure

### 9. Next Step Messaging
After successful save, prints:
```
PRD created successfully at projects/<project-name>/02-prd.md

Next: Run `/project:jtbd <project-name>` to break into jobs to be done
```

### 10. Error Handling
- Invalid project name (doesn't exist) → clear error message
- Write failure → show error with path that failed
- User cancellation → clean exit with message

---

## Implementation Notes

### Command File Structure

The command file should use markdown with YAML frontmatter:

```yaml
---
description: "Create or update a PRD for a project"
argument-hint: "<project-name>"
allowed-tools:
  - Read
  - Write
  - Bash
---
```

### Command Content Pattern

The command should follow this conversation flow:

1. **Validate project exists**
   - Check `projects/$ARGUMENTS/` folder exists
   - If not, error and exit

2. **Check prerequisites**
   - Look for `projects/$ARGUMENTS/01-research.md`
   - Warn if missing, offer to continue

3. **Load context**
   - If research file exists, read it to inform suggestions

4. **Gather PRD sections**
   - Prompt for overview
   - Prompt for goals (ask to continue adding until user says done)
   - Prompt for non-goals
   - Prompt for user stories (each with acceptance criteria, ask to continue adding)

5. **Validate completeness**
   - Check goals exist
   - Check at least one user story exists
   - Prompt to add if missing

6. **Handle existing file**
   - If `02-prd.md` exists, ask overwrite/append
   - Show current content summary

7. **Write file**
   - Use Write tool to create/update `projects/$ARGUMENTS/02-prd.md`
   - Format with proper markdown headers

8. **Print next step**
   - Show success message with file path
   - Show next command to run

### PRD Template Format

```markdown
# PRD: [Project Name]

## Overview

[Brief description]

---

## Goals

1. [Goal 1]
2. [Goal 2]
...

---

## Non-Goals

1. [Non-goal 1]
2. [Non-goal 2]
...

---

## User Stories

### US-1: [Short Title]
**As a** [role]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria**:
- [Criterion 1]
- [Criterion 2]
...

---

### US-2: [Short Title]
...
```

### Integration Points

- **With 01-research.md**: Read and use to inform PRD suggestions
- **With 03-jtbd.md**: PRD is input to JTBD breakdown (next stage)
- **With project folder**: Must validate folder exists before proceeding

### Edge Cases to Handle

1. **Project folder doesn't exist**: Error message suggesting `/project:new`
2. **Research file missing**: Warning but allow continuation
3. **PRD file already exists**: Prompt for overwrite/append action
4. **User provides incomplete information**: Re-prompt for missing required sections
5. **User cancels mid-process**: Clean exit without partial file write
6. **Write permission issues**: Clear error message with path

### Testing Verification

To verify this implementation works:

1. Run command without project name → should prompt for it
2. Run command with non-existent project → should error
3. Run command without research file → should warn but continue
4. Complete PRD flow → should create `02-prd.md` with all sections
5. Run command again on existing PRD → should offer overwrite/append
6. Try to save incomplete PRD (no goals) → should prompt to add
7. Try to save PRD with no user stories → should prompt to add
8. Complete flow → should print next step message

### Command Invocation Examples

```bash
# Basic usage
/project:prd auth-system

# If project doesn't exist
/project:prd nonexistent
# Error: Project folder not found at projects/nonexistent/
# Run /project:new nonexistent to create it first.

# If research file missing
/project:prd auth-system
# Warning: Research file not found at projects/auth-system/01-research.md
# It's recommended to run /project:research auth-system first.
# Continue anyway? (y/n)
```

---

## Verification Steps

1. **Command exists**: Verify files at `.claude/commands/project:prd.md` and `.opencode/commands/project:prd.md`
2. **Project validation**: Run with non-existent project, verify error message
3. **Prerequisite warning**: Run without research file, verify warning appears
4. **Complete flow**: Run full PRD creation, verify file created with proper format
5. **Content validation**: Try to save incomplete PRD, verify prompts for missing sections
6. **Existing file handling**: Run on existing PRD, verify overwrite/append prompt
7. **Next step message**: Verify command prints next step after successful save
8. **Context integration**: Run after research phase, verify suggestions use research context
9. **Error handling**: Test write failures, cancellations, verify clean error messages
10. **Cross-tool compatibility**: Verify identical behavior in Claude Code and OpenCode

---

## Related Tasks

- **Task 002-001** (Create /project:research command): Provides input to this command
- **Task 002-003** (Create /project:jtbd command): Consumes output from this command
- **Task 002-007** (Prerequisite warning system): Implements the warning logic used here
- **Task 002-008** (Next step messaging): Implements the next step print logic

---

## Notes

- Keep prompts conversational but concise
- Allow flexibility in format while ensuring minimum requirements met
- PRD is a living document - users may return to edit it multiple times
- The command should feel like a helpful guide, not a rigid form
- Consider reading existing content and offering to extend it rather than always overwriting
