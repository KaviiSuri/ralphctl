# Spec: Create /project:research command

**Task ID**: 002-001
**JTBD**: 002 - Guided Planning Workflow
**Dependencies**: None

---

## Purpose

This task creates the `/project:research` command that guides users through capturing initial research and context for a project. The command provides an interactive conversation that helps users document problem statements, existing solutions, constraints, and open questions, saving the output to `01-research.md` in the project folder.

---

## Scope

### In Scope
- Command file creation for Claude Code (`.claude/commands/project:research.md`)
- Command file creation for OpenCode (`.opencode/commands/project:research.md`)
- Interactive prompts for research sections:
  - Problem statement
  - Existing solutions (prior art, alternatives)
  - Constraints (technical, business, timeline)
  - Open questions
- Project name as command argument (`/project:research <name>`)
- Create project folder if it doesn't exist
- Create or update `projects/<name>/01-research.md`
- Print next step message after completion
- Handle missing project argument (prompt user)

### Out of Scope
- Prerequisite checking (handled by Task 002-007)
- Validation of research completeness
- Integration with external research tools
- Auto-detection of existing research from codebase
- Multi-project support in single command invocation
- Research template customization

---

## Acceptance Criteria

### AC-1: Command File Structure
- Command files exist at:
  - `.claude/commands/project:research.md`
  - `.opencode/commands/project:research.md`
- Files have valid YAML frontmatter with:
  - `description`: Brief command description for autocomplete
  - `argument-hint`: Shows `<project-name>` in autocomplete
- Markdown body contains structured prompts

### AC-2: Project Argument Handling
- Command accepts project name as first argument: `/project:research auth-system`
- If no argument provided, agent prompts user for project name
- Project name validation: alphanumeric, hyphens, underscores only

### AC-3: Folder Management
- If `projects/<name>/` doesn't exist, create it automatically
- If `projects/` folder doesn't exist at repo root, create it
- No error if folder already exists

### AC-4: Research File Creation
- Create or update `projects/<name>/01-research.md`
- If file exists, agent offers to:
  - Append new research
  - Replace existing research
  - Cancel operation
- File structure includes clear sections:
  - Problem Statement
  - Research Sources / Existing Solutions
  - Constraints
  - Open Questions
  - Optional: Key Decisions section

### AC-5: Interactive Prompts
- Agent guides user through each section with focused questions:
  - "What problem are you trying to solve?"
  - "What existing solutions or prior art have you found?"
  - "What constraints do you need to consider?"
  - "What questions remain unanswered?"
- Agent validates that each section has substantive content
- Agent suggests when research is sufficient to move forward

### AC-6: Next Step Messaging
- After saving file, print clear message:
  ```
  Research saved to: projects/<name>/01-research.md

  Next step: Run `/project:prd <name>` to define requirements
  ```

### AC-7: Error Handling
- Invalid project name: Clear error with valid format examples
- File system errors: Descriptive message with troubleshooting hints
- Permission errors: Suggest checking folder permissions

---

## Implementation Notes

### Command File Template

The command should follow this structure:

```markdown
---
description: Guide research capture for a project
argument-hint: <project-name>
---

You are helping the user capture research for a project.

Project name: $1

Your task:
1. If project name is missing, ask the user for it
2. Validate project name (alphanumeric, hyphens, underscores only)
3. Check if `projects/$1/01-research.md` exists
   - If exists: Ask user if they want to append, replace, or cancel
   - If not: Create it
4. Guide the user through these sections:
   - Problem Statement: What problem are we solving?
   - Research Sources / Existing Solutions: What prior art exists?
   - Constraints: What limitations must we respect?
   - Open Questions: What needs further investigation?
5. After each section, validate it has substantive content
6. Save the complete research to `projects/$1/01-research.md`
7. Print the next step message

Use this exact format for the research file:

# Research: <Project Name>

## Problem Statement

[User's problem description]

---

## Research Sources

[Existing solutions, prior art, references]

---

## Constraints

[Technical, business, timeline constraints]

---

## Open Questions

[Unanswered questions, areas needing more research]

---

## Key Decisions

[Any decisions made during research phase]

---

After saving, print:

Research saved to: projects/$1/01-research.md

Next step: Run `/project:prd $1` to define requirements
```

### Technical Details

1. **File System Operations**:
   - Use Read tool to check if file exists
   - Use Write tool to create new file
   - Use Edit tool to append to existing file (if user chooses append)
   - Use Bash tool to create directories: `mkdir -p projects/$1`

2. **Project Name Validation**:
   - Regex: `^[a-zA-Z0-9_-]+$`
   - Reject: spaces, special characters, paths with `/`
   - Suggest valid alternatives if invalid

3. **Interactive Flow**:
   - Use conversational prompts, not forms
   - Allow user to provide all sections at once or one at a time
   - Recognize when user says "that's all" or "done"

4. **Content Quality Checks**:
   - Warn if any section is < 50 characters
   - Suggest adding more detail if sections are too brief
   - Don't block saving, just provide guidance

5. **Consistent Formatting**:
   - Use markdown headers (## for sections)
   - Use horizontal rules (---) as separators
   - Include empty line before/after sections

### Edge Cases

1. **Empty project name**: `/project:research` with no argument
   - Response: "Please provide a project name: `/project:research <name>`"

2. **Project name with spaces**: `/project:research my project`
   - Response: "Project name cannot contain spaces. Try: `my-project` or `my_project`"

3. **File already exists**: `01-research.md` present
   - Ask: "Research file exists. (A)ppend, (R)eplace, or (C)ancel?"
   - Wait for user response before proceeding

4. **Nested project paths**: `/project:research auth/login`
   - Response: "Project name cannot contain paths. Use simple name like: `auth-login`"

5. **Read-only file system**: Permission denied on mkdir or write
   - Response: "Cannot create file. Check permissions on projects/ folder."

### Testing Verification

To verify this task is complete:

1. **Command Discovery**:
   ```bash
   ls .claude/commands/project:research.md
   ls .opencode/commands/project:research.md
   ```

2. **Basic Invocation** (in Claude Code or OpenCode):
   ```
   /project:research test-project
   ```
   - Verify: Agent prompts for research sections
   - Verify: File created at `projects/test-project/01-research.md`
   - Verify: Next step message displayed

3. **Existing File Handling**:
   ```
   /project:research test-project
   ```
   - Verify: Agent asks append/replace/cancel
   - Test each option works correctly

4. **Invalid Names**:
   ```
   /project:research my project
   /project:research auth/login
   ```
   - Verify: Clear error messages with suggestions

5. **Content Quality**:
   - Provide minimal content (< 50 chars per section)
   - Verify: Agent suggests adding more detail
   - Verify: Can still save if user insists

---

## Dependencies

**Depends on**: None
**Blocks**: Task 002-007 (prerequisite warnings), Task 002-008 (next step messaging)

---

## Notes

- This is the entry point for the guided workflow
- Research can be as brief or detailed as needed
- The goal is to capture context, not create perfect documentation
- Users can skip sections if truly not applicable
- File format is designed to be human-readable and easily referenced by later commands
- The command should work identically in both Claude Code and OpenCode
