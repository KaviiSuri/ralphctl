# Spec: JTBD-004 Task 002 - Prompt User When No Tools Detected

## Purpose

This task ensures that when ralphctl's command infrastructure setup process detects no available CLI tools (neither `claude` nor `opencode` in PATH), the system prompts the user to manually select which tool(s) they want to set up commands for. This provides a fallback mechanism for users who have the tools installed but not in their PATH, or who want to prepare command files in advance.

## Scope

### In Scope
- Detecting when neither `claude` nor `opencode` CLI tools are available (result from Task 004-001)
- Prompting user with clear options: Claude Code, OpenCode, or Both
- Capturing user's choice and proceeding with selected tool(s)
- Providing informative messaging about what will be created
- Handling invalid user input gracefully

### Out of Scope
- Installing the CLI tools themselves
- Modifying PATH or environment variables
- Validating that the tools actually work (just respecting user's choice)
- Creating global configuration directories (`~/.claude/` or `~/.config/opencode/`)
- Auto-detecting tools through alternative methods (only relies on PATH check from 004-001)

## Acceptance Criteria

1. **Detection Trigger**: When Task 004-001 returns "none" (neither tool detected), this prompt logic is activated
2. **Clear Prompt**: User sees a message explaining:
   - No CLI tools were detected in PATH
   - They can still set up command files
   - What each option means (Claude Code, OpenCode, Both)
3. **Valid Options**: User can choose from:
   - "Claude Code" or "claude" or "1"
   - "OpenCode" or "opencode" or "2"
   - "Both" or "both" or "3"
   - Case-insensitive matching
4. **Invalid Input Handling**: If user enters invalid input, re-prompt with error message
5. **Downstream Integration**: User's choice is passed to Tasks 004-004 and 004-005 to determine which folders to create
6. **User Can Exit**: User can abort the process (Ctrl+C or specific exit command)

## Implementation Notes

### User Interface Flow

```
⚠️  No CLI tools detected in PATH

Neither 'claude' nor 'opencode' commands were found.
You can still set up command files for manual installation.

Which tool(s) do you want to set up?
  1. Claude Code only
  2. OpenCode only
  3. Both

Enter your choice (1-3): _
```

### Input Parsing Logic

```typescript
// Pseudo-code
const validInputs = {
  claudeCode: ['1', 'claude', 'claude code'],
  opencode: ['2', 'opencode'],
  both: ['3', 'both']
};

function parseUserChoice(input: string): 'claude' | 'opencode' | 'both' | null {
  const normalized = input.toLowerCase().trim();

  if (validInputs.claudeCode.includes(normalized)) return 'claude';
  if (validInputs.opencode.includes(normalized)) return 'opencode';
  if (validInputs.both.includes(normalized)) return 'both';

  return null;
}
```

### Error Handling

- **Invalid input**: Show error message and re-prompt (max 3 attempts)
- **User interruption (Ctrl+C)**: Clean exit with message "Setup cancelled"
- **Max retries exceeded**: Exit with helpful error message

### Integration Points

1. **Input**: Detection result from Task 004-001
   - If result is 'none', trigger this prompt
   - If result is 'claude', 'opencode', or 'both', skip this prompt

2. **Output**: User's choice ('claude', 'opencode', or 'both')
   - Used by Task 004-004 to decide whether to create `.claude/commands/`
   - Used by Task 004-005 to decide whether to create `.opencode/commands/`

### Edge Cases

1. **User has tool installed but not in PATH**: This prompt allows them to proceed anyway
2. **User wants to prepare for future tool installation**: They can set up files now
3. **User accidentally enters wrong choice**: They'll see files created for wrong tool, but can manually delete and re-run

### Success Message

After user makes choice, show confirmation:

```
✓ Setting up commands for: [Claude Code | OpenCode | Both]

Creating command files in:
  - .claude/commands/ [if applicable]
  - .opencode/commands/ [if applicable]
```

## Verification Steps

1. **Manual Testing**:
   - Temporarily modify PATH to exclude both `claude` and `opencode`
   - Run command setup process
   - Verify prompt appears with correct options
   - Test valid inputs: "1", "claude", "Claude Code", "2", "opencode", "3", "both", "BOTH"
   - Test invalid inputs: "4", "invalid", "test"
   - Test Ctrl+C interruption
   - Verify correct folders are created based on choice

2. **Unit Testing**:
   - Mock Task 004-001 to return 'none'
   - Test input parsing with various valid inputs
   - Test input parsing with invalid inputs
   - Test case-insensitivity
   - Test whitespace trimming

3. **Integration Testing**:
   - Verify choice 'claude' → only Task 004-004 creates `.claude/commands/`
   - Verify choice 'opencode' → only Task 004-005 creates `.opencode/commands/`
   - Verify choice 'both' → both tasks create their respective folders
   - Verify command files are correctly installed (Task 004-006)

## Dependencies

- **Depends on**: Task 004-001 (Detect available CLI tools)
- **Blocks**: None directly, but output influences Task 004-004 and 004-005

## Related Documentation

- Research: Detection & Setup Requirements (lines 70-82 in 03-jtbd.md)
- PRD: User Story US-6 mentions command infrastructure setup
- Tasks: Task 004-001 (detection), 004-004 (.claude folder), 004-005 (.opencode folder)
