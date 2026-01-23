# Spec: Add --project flag to run command

**Task ID**: 003-001
**JTBD**: JTBD-003 - Project-Scoped Execution
**Dependencies**: None

---

## Purpose

Enable users to run Ralph loops (plan or build mode) scoped to a specific project's specs and implementation plan, allowing multiple projects to coexist without interference.

---

## Scope

### In Scope
- Add `--project <name>` flag to the `run` command
- Resolve project path from project name (`projects/<name>/`)
- Load specs from project-specific `specs/` folder (`projects/<name>/specs/`)
- Load/update project-specific `IMPLEMENTATION_PLAN.md` (`projects/<name>/IMPLEMENTATION_PLAN.md`)
- Pass project context to agent adapter for prompt resolution
- Validate that project folder and required files exist before starting loop
- Error handling for missing project folders

### Out of Scope
- Changes to `step` or `inspect` commands (separate tasks)
- Prompt placeholder resolution (covered by Task 003-004)
- Session tagging with project name (covered by Task 003-005)
- Global prompt template updates (covered by Task 003-006)
- Project creation or initialization (covered by JTBD-001)

---

## Acceptance Criteria

### AC1: Flag Parsing
- `ralphctl run plan --project auth-system` correctly parses `--project` flag
- `ralphctl run build --project auth-system` correctly parses `--project` flag
- Flag is optional (existing behavior without flag remains unchanged)
- Short form `-p` is supported as alias for `--project`

### AC2: Project Path Resolution
- Given `--project foo`, resolves to `projects/foo/`
- Validates that `projects/foo/` exists
- If folder doesn't exist, shows clear error: "Project 'foo' not found at projects/foo/. Run 'ralphctl project:new foo' to create it."

### AC3: Specs Loading
- When `--project foo` is provided, loads specs from `projects/foo/specs/`
- If `projects/foo/specs/` doesn't exist or is empty, shows warning but continues
- Specs path is passed to agent adapter for inclusion in prompts

### AC4: Implementation Plan
- When `--project foo` is provided, uses `projects/foo/IMPLEMENTATION_PLAN.md`
- If file doesn't exist, creates it with initial template
- Implementation plan path is passed to agent adapter

### AC5: Backward Compatibility
- When `--project` is NOT provided, behavior matches current ralphctl:
  - Loads specs from root `specs/` folder
  - Uses root `IMPLEMENTATION_PLAN.md`
  - No breaking changes to existing workflows

### AC6: Error Messages
- Clear error if project folder doesn't exist
- Warning (not error) if specs folder is empty
- Auto-create IMPLEMENTATION_PLAN.md if missing

---

## Implementation Notes

### Command Structure
The `run` command likely has this signature:
```typescript
ralphctl run <mode> [options]
```

Add flag definition:
```typescript
--project <name>    Scope run to specific project
-p <name>          Alias for --project
```

### Path Resolution Logic
```
Input: --project foo
Resolve to: projects/foo/

Check existence:
1. projects/foo/ exists? → continue
2. projects/foo/ missing? → error with suggestion to run project:new

Resolve artifacts:
- specs: projects/foo/specs/
- plan: projects/foo/IMPLEMENTATION_PLAN.md
```

### Agent Adapter Interface
The agent adapter (OpenCodeAdapter or ClaudeCodeAdapter) likely needs:
```typescript
interface AgentContext {
  specsPath: string;           // "specs/" or "projects/foo/specs/"
  implementationPlanPath: string;  // "IMPLEMENTATION_PLAN.md" or "projects/foo/IMPLEMENTATION_PLAN.md"
  projectName?: string;        // undefined or "foo"
}
```

Pass this context when invoking the agent so it can:
1. Load correct specs for context
2. Read/update correct implementation plan
3. Tag session with project name (if Task 003-005 is complete)

### File Validation
Before starting the loop:
1. Validate project folder exists
2. Check if specs folder exists (warn if empty)
3. Check if IMPLEMENTATION_PLAN.md exists (create if missing)
4. Validate global prompts exist (same as current behavior)

### Implementation Plan Template
If `projects/foo/IMPLEMENTATION_PLAN.md` doesn't exist, create with:
```markdown
# Implementation Plan: foo

## Current Tasks
[ ] (empty - to be populated by planning loop)

## Completed Tasks
(none yet)

---
Last updated: [timestamp]
```

### Example Usage
```bash
# Start planning loop for auth-system project
ralphctl run plan --project auth-system

# Start build loop for payment-flow project
ralphctl run build -p payment-flow

# Run without project (backward compatible)
ralphctl run plan
```

---

## Verification Steps

### Test Case 1: Happy Path with Existing Project
1. Create project: `mkdir -p projects/test-project/specs`
2. Add dummy spec: `echo "# Test Spec" > projects/test-project/specs/test.md`
3. Run: `ralphctl run plan --project test-project`
4. Verify: Loop starts and uses project-specific paths

### Test Case 2: Missing Project Error
1. Run: `ralphctl run plan --project nonexistent`
2. Verify: Error message shows: "Project 'nonexistent' not found at projects/nonexistent/. Run 'ralphctl project:new nonexistent' to create it."
3. Verify: Command exits with non-zero code

### Test Case 3: Empty Specs Warning
1. Create project: `mkdir -p projects/empty-project/specs`
2. Run: `ralphctl run plan --project empty-project`
3. Verify: Warning about empty specs folder
4. Verify: Loop continues (doesn't exit)

### Test Case 4: Auto-Create Implementation Plan
1. Create project: `mkdir -p projects/new-project/specs`
2. Delete plan if exists: `rm -f projects/new-project/IMPLEMENTATION_PLAN.md`
3. Run: `ralphctl run plan --project new-project`
4. Verify: `projects/new-project/IMPLEMENTATION_PLAN.md` is created with template

### Test Case 5: Backward Compatibility
1. Run: `ralphctl run plan` (no --project flag)
2. Verify: Uses root `specs/` folder
3. Verify: Uses root `IMPLEMENTATION_PLAN.md`
4. Verify: No project name in session metadata

### Test Case 6: Short Form Alias
1. Create project: `mkdir -p projects/alias-test/specs`
2. Run: `ralphctl run plan -p alias-test`
3. Verify: Works identically to `--project alias-test`

---

## Edge Cases

### Edge Case 1: Project Name with Spaces
- Decision: Reject with error (project names should be kebab-case)
- Implementation: Validate project name matches pattern `^[a-z0-9-]+$`

### Edge Case 2: Nested Projects
- Decision: Not supported (projects must be direct children of `projects/`)
- Implementation: Don't support `--project foo/bar`

### Edge Case 3: Absolute vs Relative Paths
- Decision: Always resolve relative to repo root
- Implementation: Use path resolution relative to git root, not cwd

### Edge Case 4: Project Folder Exists but No Specs Folder
- Decision: Warn but continue (user might be starting fresh)
- Implementation: Check `projects/foo/` exists (error if not), warn if `specs/` missing

### Edge Case 5: Multiple --project Flags
- Decision: Last one wins (standard CLI behavior)
- Implementation: Let argument parser handle naturally

---

## Technical References

### Files Likely Affected
- `src/commands/run.ts` (or similar) - add flag definition and validation
- `src/core/project-resolver.ts` (new?) - project path resolution logic
- `src/adapters/agent-adapter.ts` - accept project context
- `src/adapters/opencode-adapter.ts` - pass paths to agent
- `src/adapters/claude-code-adapter.ts` - pass paths to agent

### Related Tasks
- **003-004**: Prompt placeholder resolution (`{project}` → actual path)
- **003-005**: Session tagging (add `project: name` to session state)
- **003-006**: Update global prompt templates to use `{project}` placeholder

### Testing Strategy
1. Unit tests for project path resolution
2. Unit tests for validation logic
3. Integration tests for full run command with --project
4. Manual testing with real projects

---

## Success Criteria Summary

This task is complete when:
1. `ralphctl run plan --project <name>` and `ralphctl run build --project <name>` work correctly
2. Project path resolution validates folder existence
3. Specs and implementation plan load from project-specific locations
4. Clear error messages for missing projects
5. Backward compatibility maintained (no --project flag works as before)
6. All verification test cases pass
