# Spec: Create local .claude/commands/ folder

**Task ID**: 004-004
**JTBD**: JTBD-004 (Command Infrastructure)
**Dependencies**: 004-001 (Detect available CLI tools), 004-003 (Verify repo root)

---

## Purpose

Create a local `.claude/commands/` directory at the repository root to hold project-specific commands for Claude Code. This directory must be local to the repository, NOT in the global `~/.claude/` directory, ensuring that commands are project-specific and version-controlled.

This task ensures that when Claude Code is detected or explicitly chosen by the user, the appropriate directory structure exists for installing the `/project:*` commands that guide users through the project-scoped Ralph workflow.

---

## Scope

### In Scope
- Detect whether `.claude/commands/` already exists at repo root
- Create `.claude/` directory if it doesn't exist
- Create `commands/` subdirectory within `.claude/`
- Only create folders when Claude Code CLI is detected OR user explicitly chooses Claude Code
- Respect user confirmation if not at repo root (via 004-003)
- Handle permission errors gracefully
- Log folder creation for debugging

### Out of Scope
- Creating global `~/.claude/` directories (explicitly NOT allowed)
- Installing actual command files (handled by 004-006)
- Detecting or creating `.opencode/` directories (handled by 004-005)
- Validating that Claude Code CLI is properly configured
- Creating `.gitignore` entries for `.claude/` (user decision)
- Creating other `.claude/` subdirectories like `agents/` or `skills/`

---

## Acceptance Criteria

### AC1: Conditional Creation Based on Tool Detection
**Given** the CLI tool detection has run (004-001)
**When** Claude Code is detected OR user explicitly selects Claude Code
**Then** proceed with folder creation

**Given** Claude Code is NOT detected AND user did not select it
**When** folder creation is attempted
**Then** skip creation without error

### AC2: Directory Creation at Repo Root
**Given** current working directory is a git repository root
**When** folder creation runs
**Then** create `.claude/commands/` at current directory (not `~/.claude/`)

**Given** current working directory is NOT a git repository root
**When** folder creation runs (after 004-003 confirmation)
**Then** create `.claude/commands/` at current directory with warning logged

### AC3: Idempotent Creation
**Given** `.claude/commands/` already exists
**When** folder creation runs
**Then** do not error, log that folder already exists, and succeed

**Given** `.claude/` exists but `commands/` subdirectory does not
**When** folder creation runs
**Then** create only the `commands/` subdirectory

### AC4: Permission Handling
**Given** insufficient permissions to create `.claude/` directory
**When** folder creation runs
**Then** throw descriptive error with permission issue and suggested fix

### AC5: Verification
**Given** folder creation completes successfully
**When** checking filesystem
**Then** `.claude/commands/` directory exists at repo root (not global location)
**And** directory is writable by current user

---

## Implementation Notes

### Technical Approach

1. **Path Resolution**
   - Use `process.cwd()` or equivalent to get current working directory
   - Construct path as `<cwd>/.claude/commands/`
   - NEVER use `~/.claude/` or `$HOME/.claude/` paths

2. **Directory Creation**
   - Use `fs.mkdirSync()` with `{ recursive: true }` option (Node.js)
   - Or equivalent in chosen language (e.g., `os.makedirs(exist_ok=True)` in Python)
   - Recursive creation handles missing parent `.claude/` directory

3. **Error Handling**
   - Catch `EACCES` / `EPERM` errors → permission issues
   - Catch `ENOSPC` errors → disk space issues
   - Re-throw unexpected errors with context

4. **Integration Points**
   - Must run AFTER 004-001 (tool detection) provides list of available tools
   - Must run AFTER 004-003 (repo root verification) confirms user wants to proceed
   - Must run BEFORE 004-006 (install command files) attempts to copy files

### Example Implementation (Pseudocode)

```javascript
async function createClaudeCommandsFolder(detectedTools, confirmedByUser) {
  // Check if we should create Claude Code folders
  if (!detectedTools.includes('claude') && !confirmedByUser.includes('claude')) {
    console.log('Skipping .claude/commands/ (Claude Code not selected)');
    return;
  }

  const targetPath = path.join(process.cwd(), '.claude', 'commands');

  // Check if already exists
  if (fs.existsSync(targetPath)) {
    console.log('.claude/commands/ already exists');
    return;
  }

  try {
    // Create directory recursively
    fs.mkdirSync(targetPath, { recursive: true });
    console.log('Created .claude/commands/ at repo root');

    // Verify writability
    fs.accessSync(targetPath, fs.constants.W_OK);
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      throw new Error(
        `Permission denied creating .claude/commands/. ` +
        `Run: chmod +w . or check directory permissions.`
      );
    }
    throw err;
  }
}
```

### Testing Strategy

1. **Unit Tests**
   - Mock filesystem to test folder creation logic
   - Test idempotency (running twice doesn't error)
   - Test permission error handling
   - Test conditional creation based on tool selection

2. **Integration Tests**
   - Create actual `.claude/commands/` in temp directory
   - Verify path is relative to cwd, not home directory
   - Verify folder is writable after creation

3. **Manual Verification**
   ```bash
   # Setup
   cd /path/to/test-repo
   rm -rf .claude/  # Clean slate

   # Run command
   ralphctl project:setup  # Or equivalent command that triggers this task

   # Verify
   test -d .claude/commands/ && echo "SUCCESS" || echo "FAIL"
   test -w .claude/commands/ && echo "WRITABLE" || echo "NOT WRITABLE"

   # Verify NOT global
   test -d ~/.claude/commands/ && echo "ERROR: Created global folder!" || echo "OK"
   ```

### Edge Cases to Handle

1. **Existing `.claude/` file (not directory)**
   - If `.claude` exists as a file, creation will fail
   - Provide clear error: "`.claude` exists as a file, not a directory. Please remove or rename it."

2. **Symlink to global directory**
   - Do not follow symlinks that point to `~/.claude/`
   - Treat as non-existent and create real directory

3. **Read-only filesystem**
   - Catch and report clearly: "Repository is on read-only filesystem"

4. **CI/CD environments**
   - Should work in ephemeral containers where cwd is repo root
   - No special handling needed if proper path resolution is used

### Verification Steps

After implementation, verify:

1. Run with Claude Code detected → `.claude/commands/` created locally
2. Run with only OpenCode detected → `.claude/commands/` NOT created
3. Run twice → second run succeeds without error (idempotent)
4. Check path: `realpath .claude/commands/` should be under repo, not `~/.claude/`
5. Run `touch .claude/commands/test.md` → should succeed (writability check)

---

## Related Tasks

- **004-001** (Detect available CLI tools): Provides input on whether Claude Code is available
- **004-003** (Verify repo root): Confirms user wants to proceed if not at repo root
- **004-005** (Create .opencode/commands/): Parallel task for OpenCode
- **004-006** (Install command files): Consumes output of this task to copy command files

---

## Success Criteria Summary

This task is complete when:

1. `.claude/commands/` directory exists at repo root (NOT `~/.claude/`)
2. Directory is only created when Claude Code is detected or user selects it
3. Operation is idempotent (can run multiple times safely)
4. Permission errors are caught and reported clearly
5. Directory is writable by current user
6. Unit and integration tests pass
