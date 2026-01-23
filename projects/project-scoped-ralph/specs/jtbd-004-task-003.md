# Spec: Verify Repo Root (JTBD-004, Task 003)

## Purpose

Verify that the current working directory is a git repository root before creating command infrastructure folders. This prevents accidentally polluting non-repo directories or subdirectories with `.claude/` or `.opencode/` folders that should only exist at the repository root.

## Scope

### In Scope
- Detect if current working directory is a git repository (has `.git` folder/file)
- Detect if current directory is the root of that repository
- Warn user when current directory is not a repo root
- Allow user to confirm and proceed even when not at repo root
- Provide clear error messages explaining the issue
- Return verification result (pass/fail) for downstream tasks to consume

### Out of Scope
- Modifying the current working directory
- Automatically changing to repo root
- Detecting worktrees or submodules
- Validating git repository health or integrity
- Creating the `.git` directory
- Handling bare repositories
- Supporting non-git version control systems

## Acceptance Criteria

### AC-1: Git Repository Detection
**Given** I am in a directory
**When** the verification runs
**Then** it should check if a `.git` folder or file exists in the current directory
**And** return whether the directory is a git repository

### AC-2: Repo Root Verification
**Given** I am in a git repository subdirectory (e.g., `repo/src/`)
**When** the verification runs
**Then** it should detect that current directory is not the repo root
**And** identify the actual repo root path
**And** warn: "Current directory is not the repository root. Command folders should be created at the repo root: <path>"

### AC-3: Non-Repo Warning
**Given** I am not in a git repository
**When** the verification runs
**Then** it should warn: "Current directory is not a git repository. Command folders are typically created at repository roots."
**And** ask: "Do you want to proceed anyway? (y/N)"

### AC-4: User Confirmation
**Given** the verification fails (not a repo or not root)
**When** the warning is displayed
**Then** the user should be prompted to confirm
**And** if user confirms (y/yes), return success with warning flag
**And** if user declines (n/no/empty), return failure and abort

### AC-5: Successful Verification
**Given** I am at the root of a git repository
**When** the verification runs
**Then** it should silently pass without prompts
**And** return success status

### AC-6: Return Value Structure
**Given** verification completes
**When** returning the result
**Then** it should include:
- `isRepoRoot: boolean` - true if current dir is repo root
- `repoRootPath: string | null` - absolute path to repo root, or null if not in a repo
- `userConfirmed: boolean` - true if user bypassed warning
- `needsWarning: boolean` - true if warning was shown

## Implementation Notes

### Technical Approach

1. **Git Repository Detection**
   - Check for `.git` directory: `fs.existsSync(path.join(process.cwd(), '.git'))`
   - Alternative: Run `git rev-parse --git-dir` (more robust, handles worktrees)

2. **Repo Root Identification**
   - Use: `git rev-parse --show-toplevel`
   - Returns absolute path to repo root
   - Compare with `process.cwd()` to check if current dir is root

3. **User Prompt**
   - Use CLI prompting library (e.g., `inquirer`, `prompts`, or native `readline`)
   - Default to "No" for safety
   - Accept: y, yes, Y, YES (case-insensitive)
   - Decline: n, no, N, NO, empty string, Ctrl+C

### Command Execution Strategy

```typescript
// Pseudo-code structure
async function verifyRepoRoot(): Promise<VerificationResult> {
  // Check if in git repo
  const gitDirResult = execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  if (gitDirResult.error) {
    return handleNonRepo();
  }

  // Check if at repo root
  const repoRoot = execSync('git rev-parse --show-toplevel').toString().trim();
  const cwd = process.cwd();

  if (repoRoot !== cwd) {
    return handleNotRoot(repoRoot);
  }

  return { isRepoRoot: true, repoRootPath: repoRoot, userConfirmed: false, needsWarning: false };
}
```

### Error Handling

- **Git not installed**: Treat as non-repo, show warning
- **Permission errors**: Treat as verification failure, show error and abort
- **Detached HEAD, bare repo**: Proceed if `--show-toplevel` succeeds
- **Ctrl+C during prompt**: Exit gracefully with code 0

### Integration Points

**Consumed By**:
- Task 004-004 (Create .claude/commands/)
- Task 004-005 (Create .opencode/commands/)

**Usage Pattern**:
```typescript
const verification = await verifyRepoRoot();
if (!verification.isRepoRoot && !verification.userConfirmed) {
  console.error('Aborted: Not at repository root');
  process.exit(1);
}
// Proceed with folder creation
```

### Warning Message Templates

**Not in a repo**:
```
⚠️  Current directory is not a git repository.
Command folders (.claude/, .opencode/) are typically created at repository roots.

Current directory: /path/to/current/dir

Do you want to proceed anyway? (y/N):
```

**In a repo but not root**:
```
⚠️  Current directory is not the repository root.
Command folders should be created at the repo root for visibility.

Current directory: /path/to/repo/subdir
Repository root:   /path/to/repo

Do you want to proceed anyway? (y/N):
```

### Testing Considerations

**Test Scenarios**:
1. At repo root → silent success
2. In repo subdirectory → warning + prompt
3. Not in repo → warning + prompt
4. User confirms warning → success with flag
5. User declines warning → failure
6. Git not available → treated as non-repo
7. Worktree → should detect worktree root correctly

**Edge Cases**:
- Symbolic links in path
- Repository with detached HEAD
- Nested repositories (monorepo structure)
- Windows path handling (backslashes)

### Dependencies

**Runtime Dependencies**:
- Git CLI must be available (handled gracefully if missing)
- Node.js `child_process` for executing git commands
- CLI prompting library for user confirmation

**Task Dependencies**:
- None (this is a Wave 1 task with no dependencies)

### Performance

- Should complete in <100ms for normal cases
- Git commands are fast and synchronous
- User prompt is blocking (by design)

## Verification Steps

1. Create test directory structure:
   ```bash
   mkdir -p /tmp/test-repo/src/components
   cd /tmp/test-repo
   git init
   ```

2. Test at repo root:
   ```bash
   cd /tmp/test-repo
   # Run verification → should pass silently
   ```

3. Test in subdirectory:
   ```bash
   cd /tmp/test-repo/src/components
   # Run verification → should warn about not being at root
   # Test both "y" and "n" responses
   ```

4. Test in non-repo:
   ```bash
   cd /tmp
   # Run verification → should warn about not being a repo
   # Test both "y" and "n" responses
   ```

5. Test with git not installed:
   ```bash
   PATH="" node verify-repo-root.js
   # Should treat as non-repo scenario
   ```

6. Verify return value structure matches specification

## Success Criteria

- [ ] Detects git repository correctly using `git rev-parse --git-dir`
- [ ] Identifies repo root correctly using `git rev-parse --show-toplevel`
- [ ] Shows appropriate warning when not at repo root
- [ ] Shows appropriate warning when not in a repo
- [ ] Prompts user for confirmation in warning scenarios
- [ ] Accepts y/yes (case-insensitive) as confirmation
- [ ] Rejects n/no/empty as decline
- [ ] Returns structured result with all required fields
- [ ] Handles git not installed gracefully
- [ ] Works correctly in all test scenarios
- [ ] Integration with Tasks 004-004 and 004-005 works as expected
