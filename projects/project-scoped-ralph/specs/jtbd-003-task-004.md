# Spec: Support {project} placeholder in prompts

## Task Reference
**JTBD**: 003 - Project-Scoped Execution
**Task**: 003-004
**Description**: Modify prompt resolver to replace `{project}` with `projects/<name>` path when --project is used.

---

## Purpose

Enable project-scoped Ralph loops by allowing prompt templates (PROMPT_plan.md, PROMPT_build.md) to dynamically reference project-specific paths using a `{project}` placeholder. This allows global prompts to work for both legacy (no --project) and project-scoped workflows without duplication.

---

## Scope

### In Scope
- Detect `{project}` placeholder in prompt content
- Replace `{project}` with `projects/<name>` when `--project <name>` flag is provided
- Support both PROMPT_plan.md and PROMPT_build.md
- Handle case where `{project}` exists in prompt but --project flag is NOT provided (error or warning)
- Support multiple occurrences of `{project}` in a single prompt file

### Out of Scope
- Other placeholder types (e.g., `{date}`, `{user}`, etc.)
- Nested placeholders (e.g., `{project.name}`)
- Conditional sections based on project presence
- Validation that the project folder exists (handled elsewhere)
- Creating or modifying project folders

---

## Acceptance Criteria

### AC-1: Placeholder Resolution
**Given** a prompt file contains `{project}` placeholder
**And** user runs `ralphctl run plan --project auth-system`
**Then** all instances of `{project}` are replaced with `projects/auth-system`

### AC-2: Multiple Occurrences
**Given** a prompt file contains multiple `{project}` placeholders
**Then** all occurrences are replaced consistently

### AC-3: No Project Flag
**Given** a prompt file contains `{project}` placeholder
**And** user runs `ralphctl run plan` WITHOUT --project flag
**Then** the command fails with a clear error message: "Prompt contains {project} placeholder but --project flag was not provided"

### AC-4: No Placeholder
**Given** a prompt file does NOT contain `{project}` placeholder
**And** user runs `ralphctl run plan --project foo`
**Then** the prompt is used as-is (no error, placeholder replacement is optional)

### AC-5: Path Format
**Given** placeholder replacement occurs
**Then** the resolved path uses forward slashes: `projects/auth-system` (not `projects\auth-system`)

### AC-6: Backward Compatibility
**Given** legacy prompts without `{project}` placeholder
**Then** they continue to work exactly as before when --project flag is NOT used

---

## Implementation Notes

### Architecture
The placeholder resolution should occur in the **prompt loading/resolution layer**, before the prompt content is passed to the agent adapter. This ensures:
- Single point of transformation
- All agents (Claude Code, OpenCode) benefit automatically
- Easy to add more placeholders in the future

### Suggested Location
Based on ralphctl architecture, the resolution likely belongs in:
- The command handler that loads prompts (`run` and `step` commands)
- OR a dedicated `PromptResolver` utility class

### Algorithm
```typescript
function resolvePromptPlaceholders(
  promptContent: string,
  options: { project?: string }
): string {
  // Check if prompt contains {project}
  const hasProjectPlaceholder = promptContent.includes('{project}');

  if (hasProjectPlaceholder && !options.project) {
    throw new Error(
      'Prompt contains {project} placeholder but --project flag was not provided. ' +
      'Either provide --project flag or remove {project} from your prompt templates.'
    );
  }

  if (options.project) {
    // Replace all occurrences
    const projectPath = `projects/${options.project}`;
    return promptContent.replaceAll('{project}', projectPath);
  }

  return promptContent;
}
```

### Edge Cases
1. **Literal braces**: If a prompt needs literal `{project}` text, provide escape mechanism (e.g., `\{project}`)
2. **Case sensitivity**: Use exact match `{project}` (not `{PROJECT}` or `{Project}`)
3. **Whitespace**: `{ project }` with spaces should NOT be replaced (strict matching)
4. **Empty project name**: If `--project ""` is passed, fail early with validation error

### Testing Strategy
Create test cases for:
- Basic replacement (single occurrence)
- Multiple occurrences in same file
- No placeholder + project flag (should work)
- Placeholder + no flag (should error)
- Legacy workflow (no placeholder, no flag)
- Path separator consistency (forward slashes)

### Integration Points
This task depends on:
- None (can be implemented independently)

This task is required by:
- **003-006**: Update global prompt templates (will add `{project}` placeholder)
- **003-001**: Add --project flag to run command (will pass project name to resolver)
- **003-002**: Add --project flag to step command (will pass project name to resolver)

### Example Usage

**PROMPT_plan.md with placeholder:**
```markdown
# Planning Agent

## Context
Study all specs in `{project}/specs/` to understand requirements.
Update `{project}/IMPLEMENTATION_PLAN.md` with task status.

## Tasks
- Analyze gap between specs and current implementation
- Generate actionable task list
- Prioritize by dependencies
```

**After resolution with `--project auth-system`:**
```markdown
# Planning Agent

## Context
Study all specs in `projects/auth-system/specs/` to understand requirements.
Update `projects/auth-system/IMPLEMENTATION_PLAN.md` with task status.

## Tasks
- Analyze gap between specs and current implementation
- Generate actionable task list
- Prioritize by dependencies
```

---

## Verification Steps

1. Create a test prompt file with `{project}` placeholder
2. Run `ralphctl run plan --project test-proj`
3. Verify placeholder is replaced with `projects/test-proj`
4. Run `ralphctl run plan` (no --project flag) with same prompt
5. Verify clear error message is shown
6. Create a prompt without `{project}` placeholder
7. Run both with and without --project flag
8. Verify both work correctly

---

## Related Tasks

- **003-001**: Add --project flag to run command
- **003-002**: Add --project flag to step command
- **003-006**: Update global prompt templates to use {project}
- **003-005**: Tag sessions with project name

---

## Notes

- This is a foundational task that enables project-scoped workflows
- Keep the implementation simple and extensible for future placeholders
- Clear error messages are critical for user experience
- Consider adding a `--dry-run` flag to preview placeholder resolution
