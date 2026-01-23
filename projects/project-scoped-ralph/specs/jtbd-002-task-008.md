# Spec: JTBD-002 Task 008 - Implement "Next Step" Messaging

## Purpose

This task ensures that each project workflow command provides clear guidance to the user about what to do next after completing its work. This creates a smooth, guided experience where users don't have to remember the command sequence or refer to documentation.

## Scope

### In Scope
- Adding "next step" messaging to all 7 project workflow commands:
  - `/project:new` → suggests `/project:research`
  - `/project:research` → suggests `/project:prd`
  - `/project:prd` → suggests `/project:jtbd`
  - `/project:jtbd` → suggests `/project:tasks`
  - `/project:tasks` → suggests `/project:hld` (optional) or `/project:specs`
  - `/project:hld` → suggests `/project:specs`
  - `/project:specs` → suggests `ralphctl run plan --project <name>`
- Consistent messaging format across all commands
- Including the project name in the suggested command

### Out of Scope
- Interactive prompts asking if user wants to proceed to next step
- Automatic execution of the next command
- Validation that the current step completed successfully before showing next step
- Suggesting alternative workflows or branching paths (except tasks→hld being optional)

## Acceptance Criteria

### AC1: Message Format
**Given** a project workflow command completes successfully
**When** the command finishes its primary work
**Then** it must print a "next step" message in this format:
```
Next: Run `/project:<next-command> <project-name>` to <description>
```

### AC2: Command-Specific Messages
**Given** each specific workflow command
**When** it completes
**Then** it shows the appropriate next command:

| Current Command | Next Step Message |
|----------------|-------------------|
| `/project:new <name>` | `Next: Run '/project:research <name>' to begin capturing research and context` |
| `/project:research <name>` | `Next: Run '/project:prd <name>' to define requirements and user stories` |
| `/project:prd <name>` | `Next: Run '/project:jtbd <name>' to identify high-level jobs to be done` |
| `/project:jtbd <name>` | `Next: Run '/project:tasks <name>' to break JTBDs into granular tasks` |
| `/project:tasks <name>` | `Next: Run '/project:hld <name>' for high-level design (optional) or '/project:specs <name>' to generate spec files` |
| `/project:hld <name>` | `Next: Run '/project:specs <name>' to generate spec files` |
| `/project:specs <name>` | `Next: Run 'ralphctl run plan --project <name>' to start planning` |

### AC3: Project Name Inclusion
**Given** a user runs any project workflow command with a specific project name
**When** the next step message is displayed
**Then** the suggested command must include that same project name

### AC4: Message Placement
**Given** a command has completed its work
**When** displaying the next step message
**Then** it must appear at the end of the command output, after all other status messages

### AC5: No Breaking Changes
**Given** existing command functionality
**When** next step messaging is added
**Then** all existing command behavior must remain unchanged

## Implementation Notes

### Technical Approach

1. **Message Helper Function**: Create a reusable utility function that formats next step messages consistently:
   ```
   printNextStep(currentCommand, projectName, nextCommand, description)
   ```

2. **Integration Points**: Add next step messaging at the end of each command's main logic, just before the command exits successfully.

3. **Error Handling**: Next step messages should only appear on successful completion. If a command encounters an error or warning, prioritize showing that information instead.

### Command File Modifications

Each command markdown file (`.claude/commands/project:*.md` and `.opencode/commands/project:*.md`) should include next step messaging in its prompt instructions.

Example for `/project:research`:
```markdown
After saving the research to `01-research.md`, print:

Next: Run `/project:prd <project-name>` to define requirements and user stories
```

### Special Cases

1. **Tasks Command**: This command has two possible next steps (HLD is optional). The message should present both options clearly, indicating HLD is optional.

2. **Specs Command**: This is the transition from planning to execution, so it suggests the `ralphctl` CLI command rather than another `/project:*` command.

3. **New Command**: This is the entry point, so it can provide a bit more context about what the research phase accomplishes.

### Testing Considerations

For each command:
1. Run the command with a test project name
2. Verify the next step message appears
3. Verify the project name is correctly included in the suggested command
4. Verify the message appears after all other output
5. Test with different project names to ensure dynamic substitution works

### Dependencies

- **Blocks**: None
- **Blocked By**: Tasks 002-001 through 002-006 (all project workflow commands must exist)

### Verification Steps

1. **Create a new test project**: Run `/project:new test-project`
   - Verify message suggests `/project:research test-project`

2. **Run research command**: Run `/project:research test-project`
   - Verify message suggests `/project:prd test-project`

3. **Run PRD command**: Run `/project:prd test-project`
   - Verify message suggests `/project:jtbd test-project`

4. **Run JTBD command**: Run `/project:jtbd test-project`
   - Verify message suggests `/project:tasks test-project`

5. **Run tasks command**: Run `/project:tasks test-project`
   - Verify message mentions both `/project:hld` (optional) and `/project:specs`

6. **Run HLD command**: Run `/project:hld test-project`
   - Verify message suggests `/project:specs test-project`

7. **Run specs command**: Run `/project:specs test-project`
   - Verify message suggests `ralphctl run plan --project test-project`

8. **Verify consistency**: Check that all messages follow the same format pattern

## Related Tasks

- **Task 002-001**: Create /project:research command
- **Task 002-002**: Create /project:prd command
- **Task 002-003**: Create /project:jtbd command
- **Task 002-004**: Create /project:tasks command
- **Task 002-005**: Create /project:hld command
- **Task 002-006**: Create /project:specs command
- **Task 002-007**: Implement prerequisite warning system

## Notes

- This task focuses purely on user guidance messaging, not on validation or enforcement
- The messaging should be helpful but not intrusive
- Users can always ignore the suggestions and run commands in any order they choose
- Consistency in messaging format helps users build a mental model of the workflow
