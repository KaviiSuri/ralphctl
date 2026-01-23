# Spec: Generate Initial Project File

**Task ID**: 001-002
**JTBD**: JTBD-001 (Project Initialization)
**Dependencies**: Task 001-001 (Create project folder structure)

---

## Purpose

Generate only the `IMPLEMENTATION_PLAN.md` file in the newly created project folder. This file is required by the Ralph loop to track implementation progress.

**Important**: Content files (01-research.md, 02-prd.md, 03-jtbd.md, 04-tasks.md, 05-hld.md) are NOT created here. They are created by their respective commands (`/project:research`, `/project:prd`, `/project:jtbd`, `/project:tasks`, `/project:hld`) as the final step of each conversational workflow.

---

## Scope

### In Scope
- Create `IMPLEMENTATION_PLAN.md` with standard Ralph loop task tracking format
- Template includes placeholder content and section headers
- Template is created in the project folder path: `projects/<name>/`

### Out of Scope
- Creating content planning files (01-research.md, 02-prd.md, 03-jtbd.md, 04-tasks.md, 05-hld.md) - these are created by their respective `/project:*` commands after conversational interaction
- Creating the `specs/` subfolder (handled by Task 001-001)
- Creating the root `projects/` folder (handled by Task 001-001)
- Command infrastructure for `/project:new` (handled by JTBD-004 tasks)
- Error handling for missing parent folder (assumes Task 001-001 completed successfully)

---

## Acceptance Criteria

### AC-1: Implementation Plan Template Created
- File exists at `projects/<name>/IMPLEMENTATION_PLAN.md`
- Contains standard Ralph loop task tracking structure
- Includes sections: Current Focus, Completed Tasks, Pending Tasks, Blocked Tasks
- Has placeholder text explaining how Ralph loops will update this file
- File is valid Markdown

### AC-2: No Content Files Created
- `01-research.md` is NOT created (will be created by `/project:research`)
- `02-prd.md` is NOT created (will be created by `/project:prd`)
- `03-jtbd.md` is NOT created (will be created by `/project:jtbd`)
- `04-tasks.md` is NOT created (will be created by `/project:tasks`)
- `05-hld.md` is NOT created (will be created by `/project:hld`)

### AC-3: Success Message Guides Next Step
- After creating IMPLEMENTATION_PLAN.md, print message directing user to run `/project:research`
- Message clearly indicates the conversational workflow

### AC-4: Atomic Creation
- If IMPLEMENTATION_PLAN.md already exists, do not overwrite it
- Log/warn that file was skipped because it already exists
- Clear error message if file creation fails

---

## Implementation Notes

### IMPLEMENTATION_PLAN.md Format

Use the standard Ralph loop format that existing ralphctl users expect:
```markdown
# Implementation Plan

## Current Focus
- [ ] [Current task being worked on]

## Completed Tasks
- [x] [Completed task 1]
- [x] [Completed task 2]

## Pending Tasks
- [ ] [Future task 1]
- [ ] [Future task 2]

## Blocked Tasks
- [ ] [Blocked task] - Blocker: [Reason]
```

### Error Handling
- If parent folder doesn't exist, throw clear error: "Project folder not found at projects/<name>. Run Task 001-001 first."
- If IMPLEMENTATION_PLAN.md already exists, log warning and skip: "Skipped IMPLEMENTATION_PLAN.md (already exists)"
- If file write fails due to permissions, throw clear error with path and permissions info

### Testing Guidance
1. **Unit test**: Template generation with mock filesystem
2. **Integration test**: Create project folder (Task 001-001) then generate template (Task 001-002)
3. **Idempotency test**: Run template generation twice, verify no overwrites
4. **Content validation test**: Parse generated template as Markdown, verify all expected sections present

### Code Organization

Suggested function signature:
```typescript
async function initializeImplementationPlan(projectName: string): Promise<void>
```

Suggested helper functions:
```typescript
function getProjectPath(projectName: string): string
function getImplementationPlanTemplate(): string
async function writeIfNotExists(path: string, content: string): Promise<boolean>
```

### Integration with Task 001-001

This task assumes Task 001-001 has created:
- `projects/<name>/` directory
- `projects/<name>/specs/` directory

This task does NOT validate that these exist; it assumes they do. If they don't, file write operations will fail with clear error messages from the OS.

### Success Message

After IMPLEMENTATION_PLAN.md is created, print:
```
✓ Created project: <name>

Folder structure:
  projects/<name>/
  ├── specs/
  └── IMPLEMENTATION_PLAN.md

Next step: Run `/project:research <name>` to start capturing research
```

---

## Verification Steps

### Manual Verification
1. Run Task 001-001 to create project folder: `projects/test-project/`
2. Run Task 001-002 to initialize IMPLEMENTATION_PLAN.md
3. Verify:
   - `projects/test-project/IMPLEMENTATION_PLAN.md` exists
   - Content matches expected format
   - Success message printed
   - NO content files (01-research.md, 02-prd.md, etc.) were created
4. Run Task 001-002 again and verify:
   - File is skipped (not overwritten)
   - Warning message shown

### Automated Verification
```bash
# After running initialization
test -f projects/test-project/IMPLEMENTATION_PLAN.md || echo "FAIL: plan template missing"

# Verify content files were NOT created
test ! -f projects/test-project/01-research.md || echo "FAIL: research should not exist"
test ! -f projects/test-project/02-prd.md || echo "FAIL: prd should not exist"
test ! -f projects/test-project/03-jtbd.md || echo "FAIL: jtbd should not exist"
test ! -f projects/test-project/04-tasks.md || echo "FAIL: tasks should not exist"
test ! -f projects/test-project/05-hld.md || echo "FAIL: hld should not exist"

# Verify Markdown validity (requires markdownlint or similar)
markdownlint projects/test-project/IMPLEMENTATION_PLAN.md

# Verify idempotency
original_hash=$(md5sum projects/test-project/IMPLEMENTATION_PLAN.md | cut -d' ' -f1)
# Run again
generated_hash=$(md5sum projects/test-project/IMPLEMENTATION_PLAN.md | cut -d' ' -f1)
test "$original_hash" = "$generated_hash" || echo "FAIL: file was overwritten"
```

---

## Definition of Done

- [ ] IMPLEMENTATION_PLAN.md is generated with proper structure
- [ ] Template includes placeholder content and clear section headers
- [ ] Template is NOT overwritten if it already exists
- [ ] Content planning files are NOT created
- [ ] Clear warning shown if IMPLEMENTATION_PLAN.md already exists
- [ ] Clear error messages for any failures
- [ ] Template is valid Markdown
- [ ] Unit tests pass for template generation logic
- [ ] Integration test passes for full project initialization flow (Task 001-001 → 001-002)
- [ ] Idempotency test passes (running twice doesn't corrupt or overwrite)
- [ ] Code review completed
- [ ] Documentation updated (if this is exposed as a standalone function/utility)
