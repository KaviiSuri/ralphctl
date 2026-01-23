# Spec: Generate Template Files

**Task ID**: 001-002
**JTBD**: JTBD-001 (Project Initialization)
**Dependencies**: Task 001-001 (Create project folder structure)

---

## Purpose

Generate empty or template versions of planning files (01-research.md through 05-hld.md) and IMPLEMENTATION_PLAN.md in the newly created project folder. These templates provide users with a clear structure for each planning phase and ensure consistency across projects.

---

## Scope

### In Scope
- Create template file: `01-research.md` with sections for problem statement, existing solutions, constraints, and open questions
- Create template file: `02-prd.md` with sections for overview, goals, non-goals, and user stories
- Create template file: `03-jtbd.md` with sections for jobs to be done breakdown
- Create template file: `04-tasks.md` with sections for task breakdown, dependency graph, and linearized order
- Create template file: `05-hld.md` (optional) with sections for components, data flow, interfaces
- Create template file: `IMPLEMENTATION_PLAN.md` with standard Ralph loop task tracking format
- All templates include placeholder content and section headers to guide users
- Templates are created in the project folder path: `projects/<name>/`

### Out of Scope
- Creating the `specs/` subfolder (handled by Task 001-001)
- Creating the root `projects/` folder (handled by Task 001-001)
- Validating or filling in actual content (done by subsequent commands)
- Command infrastructure for `/project:new` (handled by JTBD-004 tasks)
- Error handling for missing parent folder (assumes Task 001-001 completed successfully)

---

## Acceptance Criteria

### AC-1: Research Template Created
- File exists at `projects/<name>/01-research.md`
- Contains sections: Problem Statement, Research Sources, Key Decisions, Next Step
- Each section has placeholder text explaining what should go there
- File is valid Markdown

### AC-2: PRD Template Created
- File exists at `projects/<name>/02-prd.md`
- Contains sections: Overview, Goals, Non-Goals, User Stories, Technical Approach, Risks and Mitigations, Success Metrics
- Each section has placeholder text or examples
- User stories section includes format example (As a/I want to/So that)
- File is valid Markdown

### AC-3: JTBD Template Created
- File exists at `projects/<name>/03-jtbd.md`
- Contains sections for defining jobs to be done
- Includes explanation of JTBD format (Job Statement, Context, Success Criteria)
- Includes example of numbered JTBD (JTBD-001, JTBD-002)
- Contains "Next step" footer pointing to `/project:tasks`
- File is valid Markdown

### AC-4: Tasks Template Created
- File exists at `projects/<name>/04-tasks.md`
- Contains sections for: task breakdown by JTBD, dependency graph, dependency matrix, linearized implementation order
- Includes explanation of task format (ID, description, dependencies, acceptance)
- Shows example of wave-based parallel execution model
- Contains "Next step" footer pointing to `/project:hld` or `/project:specs`
- File is valid Markdown

### AC-5: HLD Template Created
- File exists at `projects/<name>/05-hld.md`
- Contains sections: Components, Data Flow, Interfaces, Technology Decisions, Integration Points
- Each section has placeholder text explaining what should go there
- Marked as optional in header
- Contains "Next step" footer pointing to `/project:specs`
- File is valid Markdown

### AC-6: Implementation Plan Template Created
- File exists at `projects/<name>/IMPLEMENTATION_PLAN.md`
- Contains standard Ralph loop task tracking structure
- Includes sections: Current Focus, Completed Tasks, Pending Tasks, Blocked Tasks
- Has placeholder text explaining how Ralph loops will update this file
- File is valid Markdown

### AC-7: All Files Created Atomically
- Either all template files are created successfully, or none are created (rollback on error)
- No partial state where some templates exist and others don't
- Clear error message if any file creation fails

### AC-8: Templates Are Read-Only Safe
- If a template file already exists, do not overwrite it
- Log/warn that file was skipped because it already exists
- Continue creating other templates that don't exist

---

## Implementation Notes

### Template Content Guidelines
1. **Keep templates concise** - Focus on structure, not exhaustive instructions
2. **Use consistent formatting** - All headers use ATX style (`#`), sections separated by `---`
3. **Include examples** - Show format for user stories, tasks, etc.
4. **Point to next step** - Each template should mention the next command to run
5. **Markdown compatibility** - Ensure templates render properly in GitHub, VS Code, etc.

### File Structure Patterns
Each template should follow this pattern:
```markdown
# [Stage Name]: [Project Context Variable]

[Brief description of this stage]

---

## [Section 1]

[Placeholder or example content]

---

## [Section N]

[Placeholder or example content]

---

**Next step**: Run `/project:[next-command] <project-name>` to continue.
```

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
- If a template file already exists, log warning and skip: "Skipped [filename] (already exists)"
- If file write fails due to permissions, throw clear error with path and permissions info

### Testing Guidance
1. **Unit test**: Template generation with mock filesystem
2. **Integration test**: Create project folder (Task 001-001) then generate templates (Task 001-002)
3. **Idempotency test**: Run template generation twice, verify no overwrites
4. **Content validation test**: Parse each generated template as Markdown, verify all expected sections present

### Code Organization
Suggested function signature:
```typescript
async function generateTemplates(projectName: string): Promise<void>
```

Suggested helper functions:
```typescript
function getTemplatePath(projectName: string, filename: string): string
function readTemplateContent(templateType: string): string
async function writeTemplateIfNotExists(path: string, content: string): Promise<boolean>
```

### Integration with Task 001-001
This task assumes Task 001-001 has created:
- `projects/<name>/` directory
- `projects/<name>/specs/` directory

This task does NOT validate that these exist; it assumes they do. If they don't, file write operations will fail with clear error messages from the OS.

### Integration with Task 001-003
After this task completes, Task 001-003 will print a summary showing all created files and the next command to run.

---

## Verification Steps

### Manual Verification
1. Run Task 001-001 to create project folder: `projects/test-project/`
2. Run Task 001-002 to generate templates
3. Verify all 6 template files exist:
   - `projects/test-project/01-research.md`
   - `projects/test-project/02-prd.md`
   - `projects/test-project/03-jtbd.md`
   - `projects/test-project/04-tasks.md`
   - `projects/test-project/05-hld.md`
   - `projects/test-project/IMPLEMENTATION_PLAN.md`
4. Open each file in Markdown editor and verify:
   - Proper heading structure
   - Section headers present
   - Placeholder content makes sense
   - "Next step" footer is present (where applicable)
   - Markdown renders correctly
5. Run Task 001-002 again and verify:
   - All files are skipped (not overwritten)
   - Warning messages shown for each skipped file
   - No errors thrown

### Automated Verification
```bash
# After running template generation
test -f projects/test-project/01-research.md || echo "FAIL: research template missing"
test -f projects/test-project/02-prd.md || echo "FAIL: prd template missing"
test -f projects/test-project/03-jtbd.md || echo "FAIL: jtbd template missing"
test -f projects/test-project/04-tasks.md || echo "FAIL: tasks template missing"
test -f projects/test-project/05-hld.md || echo "FAIL: hld template missing"
test -f projects/test-project/IMPLEMENTATION_PLAN.md || echo "FAIL: plan template missing"

# Verify Markdown validity (requires markdownlint or similar)
markdownlint projects/test-project/*.md

# Verify idempotency
original_hash=$(md5sum projects/test-project/01-research.md | cut -d' ' -f1)
# Run template generation again
generated_hash=$(md5sum projects/test-project/01-research.md | cut -d' ' -f1)
test "$original_hash" = "$generated_hash" || echo "FAIL: file was overwritten"
```

---

## Definition of Done

- [ ] All 6 template files are generated with proper structure
- [ ] Templates include placeholder content and clear section headers
- [ ] Templates are NOT overwritten if they already exist
- [ ] Clear warnings are shown for skipped files
- [ ] Clear error messages for any failures
- [ ] All templates are valid Markdown
- [ ] Unit tests pass for template generation logic
- [ ] Integration test passes for full project initialization flow (Task 001-001 → 001-002)
- [ ] Idempotency test passes (running twice doesn't corrupt or overwrite)
- [ ] Code review completed
- [ ] Documentation updated (if this is exposed as a standalone function/utility)
