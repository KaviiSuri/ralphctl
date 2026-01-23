# Spec: Detect Available CLI Tools

**Task ID**: 004-001
**JTBD**: JTBD-004 Command Infrastructure
**Dependencies**: None
**Blocks**: 004-002, 004-004, 004-005

---

## Purpose

This task implements CLI tool detection to determine which AI coding assistants (Claude Code and/or OpenCode) are available in the user's environment. This detection is the foundation for intelligently setting up project commands in the correct tool-specific directories.

---

## Scope

### In Scope

- Detect if `claude` CLI command is available in PATH
- Detect if `opencode` CLI command is available in PATH
- Return detection results in a structured format indicating: both available, claude-only, opencode-only, or none
- Handle cases where commands exist but may not be executable
- Provide a programmatic interface (function/method) that can be called by other tasks

### Out of Scope

- Installing or configuring the CLI tools themselves
- Validating that the detected tools are properly authenticated
- Checking version numbers or compatibility
- Detecting other AI coding assistants (e.g., Cursor, Aider, etc.)
- Prompting the user for input (that's Task 004-002)
- Creating any directories (that's Task 004-004 and 004-005)
- Global configuration detection (only checking command availability)

---

## Acceptance Criteria

### AC-1: Claude Code Detection
**Given** the `claude` command is available in PATH
**When** the detection function is called
**Then** it should return a result indicating Claude Code is available

### AC-2: OpenCode Detection
**Given** the `opencode` command is available in PATH
**When** the detection function is called
**Then** it should return a result indicating OpenCode is available

### AC-3: Both Tools Available
**Given** both `claude` and `opencode` commands are available in PATH
**When** the detection function is called
**Then** it should return a result indicating both tools are available

### AC-4: No Tools Available
**Given** neither `claude` nor `opencode` commands are available in PATH
**When** the detection function is called
**Then** it should return a result indicating no tools are available

### AC-5: Cross-Platform Compatibility
**Given** the detection runs on different operating systems (macOS, Linux, Windows)
**When** the detection function is called
**Then** it should work correctly on all supported platforms

### AC-6: Non-Executable Commands
**Given** a command exists in PATH but is not executable
**When** the detection function is called
**Then** it should treat the command as not available

---

## Implementation Notes

### Technical Approach

1. **Command Detection Method**: Use Node.js `child_process.execSync` with `which` (Unix) or `where` (Windows) to check command availability, OR use a cross-platform package like `command-exists` or `which` npm package.

2. **Return Structure**: Consider returning an object like:
   ```typescript
   interface ToolDetectionResult {
     claude: boolean;
     opencode: boolean;
     hasAny: boolean;
     hasBoth: boolean;
   }
   ```

3. **Error Handling**: Commands that don't exist will throw errors when checked. Catch these gracefully and treat as "not available".

4. **Platform Differences**:
   - Unix-like (macOS, Linux): Use `which` command
   - Windows: Use `where` command
   - Consider using npm package `which` for cross-platform consistency

### Integration Points

- This function will be called by:
  - Task 004-002 (prompt user when no tools detected)
  - Task 004-004 (create .claude/commands/ folder)
  - Task 004-005 (create .opencode/commands/ folder)
  - Task 004-006 (install command files)

- The function should be exported from a utility module (e.g., `src/utils/toolDetection.ts` or similar)

### Example Usage

```typescript
import { detectAvailableTools } from './utils/toolDetection';

const tools = detectAvailableTools();

if (tools.hasBoth) {
  console.log('Both Claude Code and OpenCode detected');
} else if (tools.claude) {
  console.log('Only Claude Code detected');
} else if (tools.opencode) {
  console.log('Only OpenCode detected');
} else {
  console.log('No tools detected');
}
```

### Testing Strategy

1. **Unit Tests**: Mock command execution to test all four detection scenarios
2. **Integration Tests**: Run in environments with different tool combinations
3. **Edge Cases**:
   - Command exists but not in PATH
   - Command in PATH but not executable
   - Command detection timeout
   - Permission errors

### Performance Considerations

- Command detection should be fast (< 100ms per tool)
- Consider caching detection results for the duration of a command execution
- Avoid repeated detection calls if results won't change during execution

### Error Messages

If detection fails unexpectedly (not just "command not found"):
- Log the error for debugging
- Treat as "tool not available" rather than failing the entire operation
- Consider adding a verbose mode for troubleshooting

---

## Verification Steps

1. **Manual Testing**:
   - Run on system with both tools installed → should detect both
   - Run on system with only Claude Code → should detect claude only
   - Run on system with only OpenCode → should detect opencode only
   - Run on system with neither tool → should detect none

2. **Automated Testing**:
   - Write unit tests that mock command execution
   - Test all four detection scenarios
   - Test error handling (command throws unexpected error)
   - Test cross-platform compatibility

3. **Code Review Checklist**:
   - [ ] Function is exported and documented
   - [ ] Return type is clearly defined
   - [ ] Error handling is comprehensive
   - [ ] Works on all target platforms
   - [ ] Has appropriate test coverage
   - [ ] No false positives or false negatives

---

## Related Files

From the research, these files will likely be involved:
- `src/utils/toolDetection.ts` (new file to create)
- `src/commands/project.ts` (will consume this utility)
- Tests directory for unit tests

---

## References

- **Research Document**: `/Users/kaviisuri/code/KaviiSuri/ralphctl/projects/project-scoped-ralph/01-research.md`
  - Section: "Extensibility Research" covers Claude Code and OpenCode command structures

- **PRD Document**: `/Users/kaviisuri/code/KaviiSuri/ralphctl/projects/project-scoped-ralph/02-prd.md`
  - User Story US-1 through US-9 describe the context for command usage

- **JTBD Document**: `/Users/kaviisuri/code/KaviiSuri/ralphctl/projects/project-scoped-ralph/03-jtbd.md`
  - JTBD-004: "Command Infrastructure" provides the job context
  - Detection & Setup Requirements section specifies auto-detection behavior

- **Tasks Document**: `/Users/kaviisuri/code/KaviiSuri/ralphctl/projects/project-scoped-ralph/04-tasks.md`
  - Task 004-001 definition
  - Dependency graph showing this task blocks 004-002, 004-004, 004-005

---

## Success Metrics

- Detection completes in < 100ms per tool
- Zero false positives (detecting tools that don't work)
- Zero false negatives (missing tools that are available)
- Works correctly on macOS, Linux, and Windows
- Test coverage > 90% for detection logic
