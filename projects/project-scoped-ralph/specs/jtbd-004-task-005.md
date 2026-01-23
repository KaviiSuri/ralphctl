# Spec: JTBD-004 Task-005 - Create local .opencode/commands/ folder

## Purpose

Create a local `.opencode/commands/` directory at the repository root to house project-specific commands for OpenCode. This ensures commands are scoped to the repository rather than installed globally, allowing different projects to have different command sets and avoiding pollution of the user's global OpenCode configuration.

## Scope

### In Scope
- Detecting whether OpenCode CLI is available in PATH
- Creating `.opencode/commands/` directory at repository root (not `~/.config/opencode/`)
- Creating the folder only when OpenCode is detected OR user explicitly chooses it
- Handling cases where the folder already exists (idempotent operation)
- Working in conjunction with tool detection (Task 004-001) and repo root verification (Task 004-003)

### Out of Scope
- Creating global OpenCode configuration folders
- Installing command files (handled by Task 004-006)
- Creating `.opencode/agents/`, `.opencode/tools/`, or other OpenCode directories
- Modifying existing OpenCode configuration files
- Creating the folder if neither tool is detected and user doesn't choose OpenCode
- Error handling for filesystem permission issues (should fail with clear error)

## Acceptance Criteria

### AC-1: Folder Creation Location
- **Given** the repository root is `/path/to/repo`
- **When** the command infrastructure setup runs
- **Then** the folder is created at `/path/to/repo/.opencode/commands/`
- **And** the folder is NOT created at `~/.config/opencode/commands/` or any global location

### AC-2: Conditional Creation - Tool Detected
- **Given** `opencode` CLI is detected in PATH (from Task 004-001)
- **When** the setup process runs
- **Then** `.opencode/commands/` folder is created

### AC-3: Conditional Creation - User Choice
- **Given** `opencode` CLI is NOT detected in PATH
- **And** user selects "OpenCode" or "Both" when prompted (from Task 004-002)
- **When** the setup process runs
- **Then** `.opencode/commands/` folder is created

### AC-4: Skip Creation - Not Selected
- **Given** `opencode` CLI is NOT detected in PATH
- **And** user selects "Claude Code" only when prompted
- **When** the setup process runs
- **Then** `.opencode/commands/` folder is NOT created

### AC-5: Idempotent Operation
- **Given** `.opencode/commands/` already exists at the repo root
- **When** the setup process runs
- **Then** no error is thrown
- **And** existing folder structure is preserved

### AC-6: Repo Root Confirmation
- **Given** repo root verification has passed (from Task 004-003)
- **When** folder creation is triggered
- **Then** folder is created in the verified repository root directory

### AC-7: Folder Permissions
- **Given** the folder is created successfully
- **When** checking folder permissions
- **Then** folder has appropriate permissions for the current user to write files

## Implementation Notes

### Technical Guidance

1. **Tool Detection Integration**
   - Use the result from Task 004-001 (detect available CLI tools)
   - Should receive information about whether `opencode` command is available
   - Example check: `which opencode` or `command -v opencode`

2. **User Choice Integration**
   - If tool is not detected, check the user's choice from Task 004-002
   - User choices: "Claude Code", "OpenCode", "Both"
   - Create folder if choice includes "OpenCode" or "Both"

3. **Path Resolution**
   - Use the repository root path from Task 004-003
   - Construct path: `${REPO_ROOT}/.opencode/commands/`
   - Do NOT use relative paths or assume current working directory

4. **Folder Creation**
   - Use `mkdir -p .opencode/commands/` to create nested structure in one command
   - The `-p` flag ensures parent directories are created and no error if folder exists
   - Alternative in Node.js: `fs.mkdirSync(path, { recursive: true })`

5. **Error Handling**
   - If folder creation fails due to permissions, fail with clear error message
   - Suggested error message: "Failed to create .opencode/commands/ directory. Check permissions for: ${REPO_ROOT}"
   - Do NOT attempt to create folder in global location as fallback

6. **Logging/Output**
   - On success: "Created .opencode/commands/ directory"
   - If already exists: No output needed (idempotent)
   - Consider grouping output with `.claude/commands/` creation for cleaner UX

### Dependencies

- **Task 004-001**: Detect available CLI tools - provides information about whether OpenCode is available
- **Task 004-003**: Verify repo root - provides the verified repository root path to create the folder in

### Related Tasks

- **Task 004-004**: Create local `.claude/commands/` folder - parallel task for Claude Code
- **Task 004-006**: Install command files - will populate this folder with actual command files

### OpenCode Command Directory Structure

For reference, OpenCode's command discovery looks for files in:
1. Local: `.opencode/commands/*.md` (this is what we're creating)
2. Global: `~/.config/opencode/commands/*.md` (not used by this task)

Each command file is a Markdown file with optional YAML frontmatter:
```markdown
---
description: Command description shown in autocomplete
---

# Command content here
```

### Example Implementation Flow

```typescript
// Pseudocode for clarity
async function createOpenCodeCommandsFolder(
  isOpenCodeAvailable: boolean,
  userChoice: 'claude' | 'opencode' | 'both' | null,
  repoRoot: string
): Promise<void> {
  // Determine if we should create the folder
  const shouldCreate =
    isOpenCodeAvailable ||
    userChoice === 'opencode' ||
    userChoice === 'both';

  if (!shouldCreate) {
    return; // Skip creation
  }

  // Construct path
  const commandsPath = path.join(repoRoot, '.opencode', 'commands');

  // Create folder (idempotent)
  try {
    await fs.mkdir(commandsPath, { recursive: true });
    console.log('Created .opencode/commands/ directory');
  } catch (error) {
    throw new Error(
      `Failed to create .opencode/commands/ directory. Check permissions for: ${repoRoot}\n${error.message}`
    );
  }
}
```

## Verification Steps

### Manual Testing

1. **Test 1: OpenCode Detected**
   ```bash
   # Prerequisites: opencode CLI installed
   cd /path/to/test-repo
   ralphctl init-commands  # or whatever command triggers this

   # Verify
   ls -la .opencode/commands/  # Should exist
   ls -la ~/.config/opencode/commands/  # Should NOT be created by this task
   ```

2. **Test 2: User Chooses OpenCode**
   ```bash
   # Prerequisites: opencode CLI NOT installed
   cd /path/to/test-repo
   ralphctl init-commands
   # When prompted, select "OpenCode"

   # Verify
   ls -la .opencode/commands/  # Should exist
   ```

3. **Test 3: User Chooses Claude Code Only**
   ```bash
   # Prerequisites: opencode CLI NOT installed
   cd /path/to/test-repo
   ralphctl init-commands
   # When prompted, select "Claude Code"

   # Verify
   ls -la .opencode/  # Should NOT exist
   ```

4. **Test 4: Idempotent Operation**
   ```bash
   cd /path/to/test-repo
   mkdir -p .opencode/commands
   echo "test" > .opencode/commands/test.txt

   ralphctl init-commands

   # Verify
   cat .opencode/commands/test.txt  # Should still contain "test"
   ```

5. **Test 5: Repo Root Verification**
   ```bash
   cd /path/to/test-repo/subdir
   ralphctl init-commands
   # Should warn about not being in repo root
   # If user confirms, should create in repo root, not subdir

   # Verify
   ls -la /path/to/test-repo/.opencode/commands/  # Should exist
   ls -la /path/to/test-repo/subdir/.opencode/  # Should NOT exist
   ```

### Automated Testing

```typescript
describe('Task 004-005: Create .opencode/commands folder', () => {
  test('creates folder at repo root when OpenCode is detected', async () => {
    const result = await createOpenCodeCommandsFolder(
      true,  // isOpenCodeAvailable
      null,  // userChoice
      '/test/repo'
    );

    expect(fs.existsSync('/test/repo/.opencode/commands')).toBe(true);
    expect(fs.existsSync('~/.config/opencode/commands')).toBe(false);
  });

  test('creates folder when user selects OpenCode', async () => {
    await createOpenCodeCommandsFolder(
      false,  // isOpenCodeAvailable
      'opencode',  // userChoice
      '/test/repo'
    );

    expect(fs.existsSync('/test/repo/.opencode/commands')).toBe(true);
  });

  test('skips creation when user selects Claude Code only', async () => {
    await createOpenCodeCommandsFolder(
      false,  // isOpenCodeAvailable
      'claude',  // userChoice
      '/test/repo'
    );

    expect(fs.existsSync('/test/repo/.opencode')).toBe(false);
  });

  test('is idempotent - does not fail if folder exists', async () => {
    fs.mkdirSync('/test/repo/.opencode/commands', { recursive: true });
    fs.writeFileSync('/test/repo/.opencode/commands/existing.md', 'test');

    await expect(
      createOpenCodeCommandsFolder(true, null, '/test/repo')
    ).resolves.not.toThrow();

    expect(fs.readFileSync('/test/repo/.opencode/commands/existing.md', 'utf8'))
      .toBe('test');
  });
});
```

## Success Metrics

- Folder is created in the correct local location (repo root), never globally
- Folder is only created when OpenCode is detected or user explicitly chooses it
- Operation is idempotent and does not break existing folder structures
- Clear error messages on permission failures
- Integrates cleanly with tool detection and repo verification tasks

## References

### Project Context
- **Research**: Section "Extensibility Research > OpenCode" in `/Users/kaviisuri/code/KaviiSuri/ralphctl/projects/project-scoped-ralph/01-research.md`
- **PRD**: User Story US-4 in `/Users/kaviisuri/code/KaviiSuri/ralphctl/projects/project-scoped-ralph/02-prd.md`
- **JTBD**: JTBD-004 in `/Users/kaviisuri/code/KaviiSuri/ralphctl/projects/project-scoped-ralph/03-jtbd.md`

### Related Specifications
- Task 004-001: Detect available CLI tools
- Task 004-003: Verify repo root
- Task 004-004: Create local `.claude/commands/` folder
- Task 004-006: Install command files

### OpenCode Documentation
- OpenCode command discovery: `.opencode/commands/*.md`
- OpenCode uses similar structure to Claude Code for command files
- Both tools support Markdown files with optional YAML frontmatter
