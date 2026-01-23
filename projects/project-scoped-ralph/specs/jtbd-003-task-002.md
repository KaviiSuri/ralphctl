# Spec: Add --project flag to step command

**Task ID**: 003-002
**JTBD**: JTBD-003 - Project-Scoped Execution
**Dependencies**: 003-005 (Tag sessions with project name)

---

## Purpose

Enable the `ralphctl step` command to accept a `--project <name>` flag that scopes the interactive single-iteration session to a specific project's specs and implementation plan. This allows developers to perform manual, interactive work within the context of a specific project without affecting other projects.

---

## Scope

### In Scope
- Accept `--project <name>` flag for `step plan` command
- Accept `--project <name>` flag for `step build` command
- Resolve project-scoped paths for specs (`projects/<name>/specs/`)
- Resolve project-scoped paths for implementation plan (`projects/<name>/IMPLEMENTATION_PLAN.md`)
- Use `{project}` placeholder replacement in prompt templates
- Tag session with project name in session state
- Validate that project folder exists before starting session
- Show clear error message if project doesn't exist

### Out of Scope
- Creating new project folders (handled by `/project:new` command)
- Modifying the TUI interaction flow
- Changes to agent adapter interfaces
- Auto-detection of project from current directory
- Running multiple projects simultaneously in one session

---

## Acceptance Criteria

### AC1: Command accepts --project flag
**Given** the user runs `ralphctl step plan --project auth-system`
**When** the command executes
**Then** it should use `projects/auth-system/specs/` for specs and `projects/auth-system/IMPLEMENTATION_PLAN.md` for the implementation plan

### AC2: Works for both plan and build modes
**Given** the user runs `ralphctl step build --project auth-system`
**When** the command executes
**Then** it should use the same project-scoped paths as plan mode

### AC3: Project validation
**Given** the user runs `ralphctl step plan --project nonexistent`
**When** the project folder doesn't exist
**Then** it should show an error message: "Project 'nonexistent' not found at projects/nonexistent. Run 'ralphctl init --project nonexistent' or create it manually."

### AC4: Prompt placeholder replacement
**Given** `PROMPT_plan.md` contains `{project}` placeholder
**And** the user runs `ralphctl step plan --project auth-system`
**When** the prompt is loaded
**Then** `{project}` should be replaced with `projects/auth-system`

### AC5: Session tagging
**Given** the user runs `ralphctl step plan --project auth-system`
**When** the session is recorded in `.ralphctl/ralph-sessions.json`
**Then** the session record should include a `project: "auth-system"` field

### AC6: Works without --project flag
**Given** the user runs `ralphctl step plan` (no --project flag)
**When** the command executes
**Then** it should use the legacy global paths (`specs/`, `IMPLEMENTATION_PLAN.md`)

### AC7: Agent receives correct file paths
**Given** the user runs `ralphctl step plan --project auth-system`
**When** the agent is initialized
**Then** the agent should receive file references pointing to project-scoped paths

---

## Implementation Notes

### File Path Resolution

1. **Specs directory**:
   - Without `--project`: `specs/`
   - With `--project foo`: `projects/foo/specs/`

2. **Implementation plan**:
   - Without `--project`: `IMPLEMENTATION_PLAN.md`
   - With `--project foo`: `projects/foo/IMPLEMENTATION_PLAN.md`

3. **Prompt templates** (remain global):
   - `PROMPT_plan.md`
   - `PROMPT_build.md`
   - Use `{project}` placeholder for dynamic path injection

### Project Validation

Before starting the session:
```typescript
if (projectFlag) {
  const projectPath = path.join(process.cwd(), 'projects', projectFlag);
  if (!fs.existsSync(projectPath)) {
    console.error(`Project '${projectFlag}' not found at ${projectPath}`);
    console.error(`Run 'ralphctl init --project ${projectFlag}' or create it manually.`);
    process.exit(1);
  }
}
```

### Placeholder Replacement

When loading prompt templates:
```typescript
let promptContent = fs.readFileSync(promptPath, 'utf-8');
const projectPath = projectFlag ? `projects/${projectFlag}` : '';
promptContent = promptContent.replace(/{project}/g, projectPath);
```

### Session State

Session records should include:
```typescript
{
  sessionId: string;
  mode: 'plan' | 'build';
  project?: string;  // Add this field when --project is used
  startTime: number;
  // ... other fields
}
```

### CLI Flag Definition

Add to the `step` command:
```typescript
.option('--project <name>', 'Scope the session to a specific project')
```

### Backward Compatibility

- Commands without `--project` flag continue to work as before
- Existing global `specs/` and `IMPLEMENTATION_PLAN.md` remain functional
- No migration required for existing setups

### Error Handling

1. **Project doesn't exist**: Show helpful error with creation command
2. **Missing specs folder**: Warn but allow continuation (agent might create it)
3. **Missing implementation plan**: Warn but allow continuation (agent might create it)

### Testing Approach

**Manual verification**:
1. Create a test project with `ralphctl init --project test-proj`
2. Run `ralphctl step plan --project test-proj`
3. Verify TUI opens with project-scoped context
4. Check `.ralphctl/ralph-sessions.json` includes `project: "test-proj"`
5. Verify agent can access specs from `projects/test-proj/specs/`
6. Run `ralphctl step build --project test-proj` and verify same behavior
7. Run `ralphctl step plan` (no flag) and verify legacy paths still work
8. Run `ralphctl step plan --project nonexistent` and verify error message

### Code Locations

Based on ralphctl architecture:
- **CLI command definition**: `src/cli/commands/step.ts` (or similar)
- **Path resolution**: `src/utils/paths.ts` (or similar)
- **Session state**: `src/session/sessionManager.ts` (or similar)
- **Prompt loading**: `src/prompts/promptLoader.ts` (or similar)

---

## Dependencies

**Depends on**:
- Task 003-005: Tag sessions with project name (session state schema must support project field)

**Blocks**:
- None (independent task, doesn't block others)

---

## Related Tasks

- Task 003-001: Add --project flag to run command (similar implementation)
- Task 003-003: Add --project flag to inspect command (uses project tagging)
- Task 003-004: Support {project} placeholder in prompts (enables dynamic path resolution)

---

## Verification Steps

1. Create a test project structure:
   ```bash
   mkdir -p projects/test-auth/specs
   echo "# Test spec" > projects/test-auth/specs/test.md
   echo "# Test plan" > projects/test-auth/IMPLEMENTATION_PLAN.md
   ```

2. Run project-scoped step command:
   ```bash
   ralphctl step plan --project test-auth
   ```

3. Verify in the TUI:
   - Agent references show `projects/test-auth/specs/` paths
   - Implementation plan references show `projects/test-auth/IMPLEMENTATION_PLAN.md`

4. Check session record:
   ```bash
   cat .ralphctl/ralph-sessions.json | jq '.sessions[-1]'
   ```
   Should show `"project": "test-auth"`

5. Test without project flag:
   ```bash
   ralphctl step plan
   ```
   Should use global `specs/` path

6. Test error handling:
   ```bash
   ralphctl step plan --project does-not-exist
   ```
   Should show clear error message

7. Test with both modes:
   ```bash
   ralphctl step plan --project test-auth
   ralphctl step build --project test-auth
   ```
   Both should work with project-scoped paths

---

## Success Criteria

- [ ] `ralphctl step plan --project <name>` uses project-scoped paths
- [ ] `ralphctl step build --project <name>` uses project-scoped paths
- [ ] Project validation shows helpful error when project doesn't exist
- [ ] `{project}` placeholder in prompts is replaced correctly
- [ ] Sessions are tagged with project name in session state
- [ ] Legacy behavior (no --project flag) continues to work
- [ ] Manual testing passes all verification steps
