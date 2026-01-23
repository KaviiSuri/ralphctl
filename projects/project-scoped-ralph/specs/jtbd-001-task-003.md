# Spec: JTBD-001 Task 003 - Print Initialization Summary

## Task Reference

**JTBD**: 001 - Project Initialization
**Task ID**: 001-003
**Task Description**: After creation, print what was created and the next step (`/project:research <name>`).
**Dependencies**: 001-002 (Generate template files)

## Purpose

Provide clear, actionable feedback to the user after project initialization completes. This ensures users understand what was created and know exactly what to do next, reducing friction in the guided workflow.

## Scope

### In Scope
- Print a summary of created folders and files to stdout
- Display the project path structure in a clear, readable format
- Print the next recommended command to continue the workflow
- Use consistent formatting that aligns with ralphctl's CLI style
- Handle both success and partial success scenarios

### Out of Scope
- Interactive prompts or user input (this is output-only)
- Validation of file contents (that's 001-002's responsibility)
- Opening files in editor
- Running the next command automatically
- Error handling for missing files (assume 001-002 succeeded)

## Acceptance Criteria

### AC1: Success Message Display
**Given** project initialization has completed successfully
**When** the initialization function completes
**Then** a success message is displayed indicating the project was created

**Verification**:
- Message includes project name
- Message is clearly formatted and easy to read
- Message appears after all files are created

### AC2: Folder Structure Summary
**Given** the project folder has been created
**When** the summary is printed
**Then** the folder structure is displayed in a tree-like format

**Verification**:
- Shows `projects/<name>/` as root
- Lists all template files (01-research.md through IMPLEMENTATION_PLAN.md)
- Shows `specs/` subfolder
- Uses clear indentation or tree characters (├──, └──)

### AC3: Next Step Guidance
**Given** initialization is complete
**When** the summary is printed
**Then** the next command to run is clearly displayed

**Verification**:
- Displays exact command: `/project:research <name>` (with actual project name)
- Command is highlighted or formatted distinctly from other text
- Message explains what the next command does
- User can copy-paste the command directly

### AC4: Consistent CLI Formatting
**Given** ralphctl has a consistent CLI output style
**When** the summary is printed
**Then** the output matches ralphctl's existing conventions

**Verification**:
- Uses same color scheme as other ralphctl commands (if colors are used)
- Uses same symbols/characters for success indicators
- Matches spacing and layout patterns from other commands
- Fits naturally with ralphctl's overall UX

## Implementation Notes

### Output Format Example

```
✓ Project 'auth-system' created successfully!

Structure:
projects/auth-system/
├── 01-research.md
├── 02-prd.md
├── 03-jtbd.md
├── 04-tasks.md
├── 05-hld.md
├── IMPLEMENTATION_PLAN.md
└── specs/

Next step:
Run the following command to begin research:

  /project:research auth-system

This will guide you through capturing the problem statement,
existing solutions, constraints, and open questions.
```

### Technical Considerations

1. **File Path Resolution**: Use absolute paths internally but display relative paths from repo root for readability

2. **Cross-Platform Compatibility**:
   - Use Unicode tree characters (├──, └──) with ASCII fallback for systems that don't support them
   - Test on Windows, macOS, and Linux

3. **Color Handling**:
   - Check if terminal supports colors before using them
   - Provide plain text fallback
   - Use existing ralphctl color utility if available

4. **Error Context**:
   - If called when files are missing, still print structure but indicate missing items
   - This is defensive programming even though 001-002 should ensure all files exist

5. **Integration Point**:
   - This function should be called at the end of the `/project:new` command
   - Should be a pure function that takes project name and path as input
   - Should return/print string output, not modify any files

6. **Consistency with Other Commands**:
   - Follow the pattern established by other ralphctl commands
   - Use same helper functions for formatting (if they exist)
   - Match the tone and style of existing output messages

### Testing Considerations

**Manual Testing**:
- Run `/project:new test-project` and verify output
- Check output in different terminal emulators
- Verify copy-paste of suggested command works
- Test with very long project names
- Test with project names containing special characters

**Automated Testing** (if applicable):
- Unit test for output string generation
- Test tree structure rendering with various file lists
- Test next step message formatting
- Snapshot testing for output format consistency

### Edge Cases

1. **Very Long Project Names**: Ensure layout doesn't break
2. **Special Characters in Name**: Handle spaces, hyphens, underscores in display
3. **Terminal Width**: Consider wrapping for narrow terminals
4. **No Color Support**: Ensure output is still readable in plain text

## Dependencies

**Upstream Dependencies**:
- 001-001: Project folder must exist at `projects/<name>/`
- 001-002: Template files must be created

**Downstream Dependencies**: None (this is the final step in initialization)

## Success Metrics

- User can immediately identify what was created
- User knows exactly what command to run next
- Zero confusion or follow-up questions about "what now?"
- Output is visually clear and professional

## Notes

- This task is purely about user experience and developer happiness
- Good summary output significantly reduces cognitive load
- Consider this the "closing bracket" on the initialization workflow
- The quality of this output sets expectations for the rest of the guided workflow
