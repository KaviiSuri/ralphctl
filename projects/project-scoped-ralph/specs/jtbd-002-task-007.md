# Spec: Implement prerequisite warning system

**Task ID**: 002-007
**JTBD**: JTBD-002 - Guided Planning Workflow
**Dependencies**: Tasks 002-001 through 002-006

---

## Purpose

Implement a prerequisite validation system for the project planning workflow commands (`/project:research`, `/project:prd`, `/project:jtbd`, `/project:tasks`, `/project:hld`, `/project:specs`) that checks if previous stage artifacts exist before proceeding. When prerequisites are missing, the system warns the user but allows them to proceed if they explicitly confirm.

This ensures users are aware when they're skipping stages while maintaining flexibility for users who may have context from other sources or want to work non-linearly.

---

## Scope

### In Scope
- Prerequisite validation logic that checks for existence of expected prior stage files
- Warning messages that clearly communicate what prerequisites are missing
- User confirmation prompts that allow proceeding despite missing prerequisites
- Graceful handling when users choose to abort vs continue
- Integration of prerequisite checks into all 6 planning workflow commands

### Out of Scope
- Hard blocking users from proceeding (warnings only, not errors)
- Validation of file content completeness or quality
- Cross-command state management or persistent user preferences about warnings
- Prerequisite checks for non-planning commands (e.g., `/project:new`)
- Auto-creation of missing prerequisite files

---

## Acceptance Criteria

### AC1: Prerequisite Mapping
- Each planning command has a defined list of prerequisite files it should check for:
  - `/project:research` → no prerequisites (first step)
  - `/project:prd` → checks for `01-research.md`
  - `/project:jtbd` → checks for `02-prd.md`
  - `/project:tasks` → checks for `03-jtbd.md`
  - `/project:hld` → checks for `03-jtbd.md` and `04-tasks.md`
  - `/project:specs` → checks for `04-tasks.md` (03-jtbd.md also recommended but not required)

### AC2: Warning Display
When prerequisites are missing:
- Display clear warning message listing which files are missing
- Explain why these prerequisites are recommended
- Example format:
  ```
  ⚠️  Warning: Missing prerequisite artifacts

  The following recommended files were not found:
  - projects/<name>/02-prd.md

  It's recommended to complete the PRD phase first to ensure your JTBD breakdown
  has clear context and requirements to work from.

  Do you want to continue anyway? (y/N)
  ```

### AC3: User Confirmation
- When prerequisites are missing, prompt user with yes/no choice
- Default to "No" (user must explicitly type 'y' or 'yes' to proceed)
- Accept both lowercase and uppercase input (y, Y, yes, YES)
- If user declines:
  - Print helpful message suggesting which command to run first
  - Exit gracefully without creating or modifying files

### AC4: Successful Bypass
- If user confirms to continue despite warnings:
  - Print acknowledgment message
  - Proceed with command execution normally
  - Do not repeatedly show warning within same command execution

### AC5: No Prerequisites Scenario
- When all prerequisites exist:
  - No warning displayed
  - Command proceeds immediately
  - No interruption to user flow

### AC6: Integration with All Commands
- Prerequisite checks integrated into all 6 planning workflow commands
- Check happens BEFORE any file creation or AI interaction
- Check logic is reusable across commands (DRY principle)

---

## Implementation Notes

### Technical Approach

**1. Prerequisite Configuration**
Define prerequisite mappings as data structure in each command file:
```markdown
<!-- Prerequisite check configuration -->
<!-- prerequisites: ["02-prd.md"] -->
<!-- prerequisite-reason: "PRD provides context for JTBD breakdown" -->
```

Or embed in YAML frontmatter if commands support it:
```yaml
prerequisites:
  - file: "02-prd.md"
    reason: "PRD provides context and requirements for JTBD breakdown"
```

**2. File Existence Check**
Commands should check for file existence at path:
```
projects/$ARGUMENTS/[prerequisite-file]
```

Example bash check pattern:
```bash
if [ ! -f "projects/$PROJECT_NAME/02-prd.md" ]; then
  # Show warning and prompt
fi
```

**3. Warning Message Template**
Standardize warning format across all commands:
```
⚠️  Warning: Missing prerequisite artifacts

The following recommended files were not found:
{list of missing files}

{contextual reason why prerequisites matter}

Do you want to continue anyway? (y/N)
```

**4. User Input Handling**
Read user response and normalize:
```bash
read -p "Do you want to continue anyway? (y/N) " response
case "${response,,}" in  # Convert to lowercase
  y|yes)
    echo "Proceeding without prerequisites..."
    ;;
  *)
    echo "Aborting. Run /project:prd $PROJECT_NAME to create the prerequisite first."
    exit 0
    ;;
esac
```

**5. Command Structure Pattern**
Each command should follow this flow:
1. Parse project name from arguments
2. Check if project folder exists
3. **Run prerequisite validation** (NEW)
4. Proceed with normal command logic

### Command-Specific Prerequisites

| Command | Prerequisites | Reason |
|---------|--------------|--------|
| `/project:research` | None | First step in workflow |
| `/project:prd` | `01-research.md` | Research provides problem context for requirements |
| `/project:jtbd` | `02-prd.md` | PRD provides goals/user stories to break into jobs |
| `/project:tasks` | `03-jtbd.md` | JTBD provides high-level jobs to decompose into tasks |
| `/project:hld` | `03-jtbd.md`, `04-tasks.md` | Architecture should align with jobs and tasks |
| `/project:specs` | `04-tasks.md` | Specs are generated from task list |

### Edge Cases

**Missing Project Folder**
If the project folder itself doesn't exist:
- This is a more critical error than missing prerequisites
- Show different error message: "Project 'X' not found. Run /project:new X first."
- Do not allow proceeding

**Partial Prerequisites**
If command has multiple prerequisites and some exist:
- List only the missing ones in warning
- Reason message should explain why ALL prerequisites are helpful

**File Exists But Empty**
- File existence check is sufficient
- Content validation is out of scope for this task

### Testing Verification

To verify implementation:

1. **Happy path**: Run commands in order, verify no warnings appear
   ```
   /project:new test-project
   /project:research test-project
   /project:prd test-project  # Should proceed without warning
   ```

2. **Missing prerequisite - abort**: Skip a stage and choose to abort
   ```
   /project:new test-project
   /project:jtbd test-project  # Missing 01-research.md and 02-prd.md
   # Enter 'n' at prompt
   # Verify: Command exits, no files created
   ```

3. **Missing prerequisite - continue**: Skip a stage and choose to continue
   ```
   /project:new test-project
   /project:jtbd test-project  # Missing prerequisites
   # Enter 'y' at prompt
   # Verify: Warning shown, then proceeds to create 03-jtbd.md
   ```

4. **Multiple missing prerequisites**:
   ```
   /project:new test-project
   /project:hld test-project  # Missing both 03-jtbd.md and 04-tasks.md
   # Verify: Both files listed in warning
   ```

5. **Case sensitivity**: Test with Y, y, YES, yes, N, n, NO, no

---

## UX Considerations

**Warning Tone**:
- Use "Warning" not "Error" - this is guidance, not a blocker
- Use "recommended" not "required" language
- Empower user to make informed choice

**Next Step Guidance**:
- When user aborts, always suggest the specific command to run next
- Include the project name in the suggestion for copy-paste convenience

**Consistency**:
- Same warning format across all commands
- Same confirmation prompt phrasing
- Same abort message pattern

---

## Success Criteria Summary

Implementation is complete when:
1. All 6 planning commands check their defined prerequisites
2. Missing prerequisites trigger clear warning with file list and reason
3. User can choose to continue (y) or abort (n/default)
4. Aborting shows helpful next step message
5. Continuing acknowledges choice and proceeds normally
6. No warnings shown when prerequisites exist
7. All test scenarios (happy path, abort, continue, multiple missing) work correctly
