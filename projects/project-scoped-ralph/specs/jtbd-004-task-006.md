# Spec: Task 004-006 - Install Command Files

## Purpose

Copy all `/project:*` command files to the appropriate local command folders (`.claude/commands/` and/or `.opencode/commands/`) based on which tools were detected or selected by the user.

This task completes the command infrastructure setup by installing the actual command files that enable the guided planning workflow, making them available for users to invoke via slash commands in Claude Code and/or OpenCode.

## Scope

### In Scope
- Installing 7 command files: `project:new.md`, `project:research.md`, `project:prd.md`, `project:jtbd.md`, `project:tasks.md`, `project:hld.md`, `project:specs.md`
- Installing to `.claude/commands/` if Claude Code is available/selected
- Installing to `.opencode/commands/` if OpenCode is available/selected
- Installing to both locations if both tools are available/selected
- Verifying that target directories exist before copying
- Reporting what was installed and where

### Out of Scope
- Creating the command folders (handled by Task 004-004 and 004-005)
- Tool detection (handled by Task 004-001)
- User prompting when no tools detected (handled by Task 004-002)
- Repo root verification (handled by Task 004-003)
- Writing the command file content itself (command content is defined separately)
- Installing to global command directories (`~/.claude/` or `~/.config/opencode/`)
- Updating existing command files (this is an initial install operation)
- Validating command file syntax or content

## Dependencies

### Required Tasks
- **Task 004-004**: `.claude/commands/` folder must exist if installing for Claude Code
- **Task 004-005**: `.opencode/commands/` folder must exist if installing for OpenCode

### Implicit Dependencies
The installation logic needs to know which tools to install for. This information comes from:
- Task 004-001 (detection results)
- Task 004-002 (user selection if prompted)

## Acceptance Criteria

### Functional Requirements
1. **Command file list**: All 7 command files are installed:
   - `project:new.md`
   - `project:research.md`
   - `project:prd.md`
   - `project:jtbd.md`
   - `project:tasks.md`
   - `project:hld.md`
   - `project:specs.md`

2. **Conditional installation**: Files are installed only to directories that exist:
   - If `.claude/commands/` exists → install all 7 files there
   - If `.opencode/commands/` exists → install all 7 files there
   - If both exist → install to both locations

3. **File verification**: After installation, verify all files were created successfully

4. **Installation report**: Display summary showing:
   - Which tools received command files
   - Count of files installed per location
   - Success/failure status

### Non-Functional Requirements
1. **Idempotency**: Running installation multiple times should be safe (overwrite existing files)
2. **Atomic operation**: Either all files install successfully or installation fails with clear error
3. **Error handling**: Clear error messages if:
   - Source command files are missing
   - Target directories don't exist
   - File write fails (permissions, disk space, etc.)

## Verification Steps

### Manual Testing
1. **Setup**: Run Tasks 004-004 and 004-005 to create target directories
2. **Execute**: Run the install command files operation
3. **Verify file presence**:
   ```bash
   ls -la .claude/commands/project:*.md
   ls -la .opencode/commands/project:*.md
   ```
4. **Verify file count**: Should see 7 files in each directory that exists
5. **Verify file content**: Spot-check that files contain valid markdown with YAML frontmatter

### Automated Testing
1. **Test case: Install to Claude Code only**
   - Given: `.claude/commands/` exists, `.opencode/commands/` does not
   - When: Install operation runs
   - Then: 7 files in `.claude/commands/`, none in `.opencode/commands/`

2. **Test case: Install to OpenCode only**
   - Given: `.opencode/commands/` exists, `.claude/commands/` does not
   - When: Install operation runs
   - Then: 7 files in `.opencode/commands/`, none in `.claude/commands/`

3. **Test case: Install to both tools**
   - Given: Both directories exist
   - When: Install operation runs
   - Then: 7 files in each directory (14 total)

4. **Test case: No target directories**
   - Given: Neither directory exists
   - When: Install operation runs
   - Then: Error message indicating no target directories found

5. **Test case: Idempotency**
   - Given: Files already installed
   - When: Install operation runs again
   - Then: Files are overwritten, no errors, same file count

## Implementation Notes

### Technical Approach

**Command File Source Location**:
The command file templates should be stored in the ralphctl codebase, likely in a `templates/commands/` directory. Options:
- Embed as string constants in code
- Store as separate `.md` files in a templates directory
- Bundle with the CLI binary

**Installation Logic**:
```typescript
interface InstallTarget {
  tool: 'claude' | 'opencode';
  path: string;  // e.g., '.claude/commands'
}

const COMMAND_FILES = [
  'project:new.md',
  'project:research.md',
  'project:prd.md',
  'project:jtbd.md',
  'project:tasks.md',
  'project:hld.md',
  'project:specs.md',
];

async function installCommandFiles(targets: InstallTarget[]) {
  for (const target of targets) {
    // Verify directory exists (should from 004-004/005)
    if (!await dirExists(target.path)) {
      console.warn(`Skipping ${target.tool}: ${target.path} not found`);
      continue;
    }

    // Install all command files
    for (const filename of COMMAND_FILES) {
      const source = getCommandTemplate(filename);
      const dest = path.join(target.path, filename);
      await fs.writeFile(dest, source, 'utf-8');
    }

    console.log(`✓ Installed ${COMMAND_FILES.length} commands to ${target.path}`);
  }
}
```

### Integration Points

**Depends On**:
- Task 004-004: Expects `.claude/commands/` to exist if targeting Claude Code
- Task 004-005: Expects `.opencode/commands/` to exist if targeting OpenCode

**Consumed By**:
- End users who will invoke these commands via `/project:*` syntax
- Future tasks that may need to update or extend command functionality

### Error Scenarios

| Error | Cause | User Action |
|-------|-------|-------------|
| "No command directories found" | Neither `.claude/commands/` nor `.opencode/commands/` exists | Run setup to create directories first (Tasks 004-004/005) |
| "Failed to write file X" | Permission denied or disk full | Check file permissions and disk space |
| "Command template not found: X" | Missing template in ralphctl | Reinstall ralphctl or report bug |

### Edge Cases

1. **Partial directory existence**: One tool's directory exists but not the other
   - **Behavior**: Install only to existing directory, skip the other with warning

2. **Read-only directories**: Target directory exists but is read-only
   - **Behavior**: Fail with clear error about permissions

3. **Existing files with different content**: Commands already exist from previous version
   - **Behavior**: Overwrite with new version (this is an upgrade scenario)

4. **Symlinked command directories**: `.claude/commands/` is a symlink
   - **Behavior**: Follow symlink and install to target location

### Command File Format

Each command file must follow Claude Code/OpenCode conventions:
- YAML frontmatter with `description` field
- Markdown body with instructions for the agent
- Support for placeholders like `$ARGUMENTS`, `$1`, `$2`
- Optional: `allowed-tools`, `argument-hint` frontmatter fields

Example structure:
```markdown
---
description: Create a new project with organized folder structure
argument-hint: <project-name>
---

# Create New Project

You are helping the user create a new project folder for ralphctl...

[Rest of command instructions]
```

### Testing Strategy

**Unit Tests**:
- Test file copying logic with mock filesystem
- Test error handling for missing directories
- Test idempotency (multiple runs produce same result)

**Integration Tests**:
- Create actual directories, run install, verify file count and content
- Test both single-tool and dual-tool scenarios
- Test upgrade scenario (overwrite existing files)

**Manual QA**:
- Install commands and verify they appear in Claude Code autocomplete
- Install commands and verify they appear in OpenCode autocomplete
- Run one of the installed commands to verify it executes correctly

### Performance Considerations

- Installing 7 small text files is fast (< 100ms total)
- No need for parallel writes, sequential is fine
- File size is minimal (~1-5 KB per command file)

### Security Considerations

- **No user input in filenames**: Command filenames are hardcoded, no injection risk
- **Local installation only**: Never write to global directories without explicit user consent
- **No execution**: Files are just markdown templates, not executed during install
- **Permissions**: Respect filesystem permissions, fail gracefully if write denied

## Success Criteria Summary

Installation is complete when:
1. All 7 command files exist in each target directory
2. Files contain valid markdown with proper frontmatter
3. User sees confirmation message listing what was installed
4. Running the same install again succeeds without errors
5. Commands appear in tool autocomplete (manual verification)
