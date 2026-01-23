# Spec: Create Project Folder Structure

**Task ID**: 001-001
**JTBD**: JTBD-001 (Project Initialization)
**Dependencies**: None

---

## Purpose

This task implements the foundational folder structure for project-scoped Ralph loops. When a user runs `/project:new <name>`, the system creates a dedicated `projects/<name>/` directory with a `specs/` subfolder, establishing the organizational foundation for all subsequent planning and implementation work.

This is the entry point for the entire project-scoped workflow. Without this structure, no other planning artifacts (research, PRD, JTBD, tasks, specs) have a home.

---

## Scope

### In Scope
- Create `projects/` directory at repo root if it doesn't exist
- Create `projects/<name>/` directory for the specific project
- Create `projects/<name>/specs/` subdirectory for spec files
- Handle case where project already exists (error or warning)
- Return success/failure status to caller

### Out of Scope
- Creating template files (handled by Task 001-002)
- Validating project name format (basic validation only)
- Setting up git ignore rules
- Creating IMPLEMENTATION_PLAN.md (handled by Task 002-006)
- Any CLI command implementation (this is internal logic only)

---

## Acceptance Criteria

1. **Folder Creation**
   - `projects/` exists at repo root after execution
   - `projects/<name>/` exists with exact name provided
   - `projects/<name>/specs/` exists as subdirectory
   - All folders have appropriate permissions (readable/writable)

2. **Idempotency**
   - If `projects/` already exists, reuse it (don't error)
   - If `projects/<name>/` already exists, return clear error message
   - If partial structure exists (e.g., folder but no specs/), complete it

3. **Error Handling**
   - Invalid project names return descriptive error (e.g., contains `/`, `..`, starts with `.`)
   - Filesystem permission errors are caught and reported
   - Parent directory must be git repo root (or user must confirm)

4. **Return Value**
   - Success: Returns absolute path to created project directory
   - Failure: Returns error with actionable message

---

## Implementation Notes

### Project Name Validation

Basic validation rules:
- Cannot be empty string
- Cannot contain path separators (`/`, `\`)
- Cannot be `.` or `..`
- Cannot start with `.` (prevents hidden folders)
- Recommended: alphanumeric, hyphens, underscores only

Example validation:
```typescript
function isValidProjectName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.includes('/') || name.includes('\\')) return false;
  if (name === '.' || name === '..') return false;
  if (name.startsWith('.')) return false;
  return true;
}
```

### Directory Structure

Exact structure to create:
```
projects/
└── <name>/
    └── specs/
```

All directories should use `mkdir -p` equivalent to handle partial existence gracefully.

### Repo Root Detection

Before creating folders:
1. Check if current working directory is a git repository (`git rev-parse --show-toplevel`)
2. If not a git repo, warn user but allow continuation if confirmed
3. This prevents accidentally creating project structures outside version control

### Error Messages

Clear, actionable error messages:
- `Project 'auth-system' already exists at projects/auth-system/`
- `Invalid project name '/my-project': cannot contain path separators`
- `Permission denied: cannot create projects/ directory`
- `Not a git repository. Create project anyway? (y/n)`

### Implementation Location

This logic should be implemented in:
- **TypeScript**: `src/commands/project/init.ts` or similar
- **Reusable function**: Export as `createProjectStructure(name: string): string` that can be called by CLI command handlers

### Testing Checklist

Manual verification steps:
1. Run from repo root → creates `projects/<name>/specs/`
2. Run twice with same name → second run errors gracefully
3. Use invalid name (e.g., `my/project`) → clear error message
4. Check folder permissions → folders are writable
5. Run from non-repo root → warning shown, user can confirm
6. Remove `specs/` manually, run again → recreates `specs/`

---

## Technical Guidance

### Filesystem Operations

Use Node.js built-in `fs` module with promises:
```typescript
import { mkdir } from 'fs/promises';
import { join } from 'path';

async function createProjectStructure(name: string): Promise<string> {
  // Validate name
  if (!isValidProjectName(name)) {
    throw new Error(`Invalid project name: ${name}`);
  }

  // Get repo root (cwd for now, validate in separate task)
  const repoRoot = process.cwd();
  const projectsDir = join(repoRoot, 'projects');
  const projectDir = join(projectsDir, name);
  const specsDir = join(projectDir, 'specs');

  // Check if project exists
  if (await exists(projectDir)) {
    throw new Error(`Project '${name}' already exists at ${projectDir}`);
  }

  // Create structure
  await mkdir(specsDir, { recursive: true });

  return projectDir;
}
```

### Integration with Command System

This function will be called by:
- `/project:new` command (Claude Code/OpenCode)
- Potentially future `ralphctl project init <name>` CLI command

The command layer should:
1. Parse project name from user input
2. Call `createProjectStructure(name)`
3. Handle success → trigger Task 001-002 (template generation)
4. Handle errors → show user-friendly message

---

## Related Tasks

- **Blocked by**: None (first task in dependency chain)
- **Blocks**:
  - Task 001-002 (Generate template files)
  - All JTBD-002 tasks (commands need folder structure to write into)
- **Related**:
  - Task 004-003 (Repo root verification) - shares repo detection logic

---

## Success Verification

After implementation, this should work:

```bash
# From repo root
$ ls projects/
# (empty or other projects)

$ ralphctl project init my-feature
# or via command: /project:new my-feature

$ ls -la projects/my-feature/
drwxr-xr-x  specs/

$ ls projects/my-feature/specs/
# (empty, ready for spec files)
```

Verification script:
```bash
#!/bin/bash
set -e

# Test 1: Create new project
ralphctl project init test-project-001
test -d projects/test-project-001/specs

# Test 2: Duplicate fails
! ralphctl project init test-project-001 2>&1 | grep "already exists"

# Test 3: Invalid name fails
! ralphctl project init "test/project" 2>&1 | grep "Invalid"

# Cleanup
rm -rf projects/test-project-001

echo "All tests passed"
```

---

## Notes

- This is a foundational task - prioritize robustness over features
- Keep error messages clear and actionable
- Don't over-validate project names initially; basic safety checks are sufficient
- Future enhancement: support project templates or configurable structures
