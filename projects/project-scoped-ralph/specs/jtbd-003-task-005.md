# Spec: Tag Sessions with Project Name

**Task ID**: 003-005
**JTBD**: 003 - Project-Scoped Execution
**Task Description**: When --project is used, add `project: <name>` field to session state in ralph-sessions.json.

---

## Purpose

Enable project-based session filtering by adding a project tag to each session's metadata. This allows users to inspect sessions for a specific project and provides traceability for which project a Ralph loop iteration was working on.

---

## Scope

### In Scope
- Add `project` field to session state structure in ralph-sessions.json
- Populate `project` field when `--project` flag is provided to `run` or `step` commands
- Ensure backward compatibility with existing sessions that don't have a project field
- Support filtering sessions by project name in the inspect command (Task 003-003 will implement the filtering logic)

### Out of Scope
- Implementing the actual `--project` flag parsing (handled by Task 003-001 and 003-002)
- Implementing filtering logic in inspect command (handled by Task 003-003)
- Validating that the project exists or has valid structure
- Migrating existing sessions to have project tags
- Project field validation or normalization (e.g., enforcing naming conventions)

---

## Acceptance Criteria

### AC1: Session State Schema
- Sessions created with `--project <name>` include a `project` field with the project name
- Sessions created without `--project` flag either omit the field or set it to `null`
- Existing sessions without a project field continue to work without errors

### AC2: Project Tag Persistence
- When a session is created with `--project foo`, the `project: "foo"` field is written to ralph-sessions.json
- The project tag persists across all iterations within the same session
- Session state can be read back and the project field is available programmatically

### AC3: Backward Compatibility
- Reading sessions that don't have a project field doesn't throw errors
- The codebase handles both tagged and untagged sessions gracefully
- No changes required to existing session files

---

## Implementation Notes

### Current Session Structure
Based on the codebase, sessions are tracked in `.ralphctl/ralph-sessions.json`. The current structure likely includes:
- `sessionId`
- `mode` (plan or build)
- `timestamp`
- `iterations` or similar tracking data

### Proposed Changes

#### 1. Session State Type Extension
Add an optional `project` field to the session state interface/type:

```typescript
interface SessionState {
  sessionId: string;
  mode: 'plan' | 'build';
  timestamp: number;
  iterations: number;
  project?: string; // Optional for backward compatibility
  // ... other fields
}
```

#### 2. Session Creation Logic
When creating a new session:
- If `--project <name>` flag is provided, include `project: name` in the session state
- If no project flag is provided, omit the field or set to `undefined`

Example:
```typescript
const sessionState: SessionState = {
  sessionId: generateId(),
  mode: options.mode,
  timestamp: Date.now(),
  iterations: 0,
  ...(options.project && { project: options.project })
};
```

#### 3. Session Reading Logic
When reading sessions from ralph-sessions.json:
- Handle cases where `project` field may not exist
- Use optional chaining or default values when accessing the project field
- Example: `session.project ?? null` or `session.project || 'untagged'`

#### 4. Session Writing
No special handling needed - the project field will be serialized like other fields when writing to JSON.

### Files to Modify

The following files likely need updates (exact paths may vary):
- Session state type definition file (likely in `src/types/` or similar)
- Session creation logic (likely in `src/commands/run.ts` and `src/commands/step.ts`)
- Session storage/persistence module (likely in `src/session/` or `src/storage/`)
- Session reading utilities

### Testing Considerations

#### Manual Testing
1. Create a session with project flag: `ralphctl run plan --project test-project`
2. Verify ralph-sessions.json contains `"project": "test-project"`
3. Create a session without project flag: `ralphctl run plan`
4. Verify ralph-sessions.json doesn't contain a project field or has `"project": null`
5. Read an old session file without project field and confirm no errors

#### Edge Cases
- Project name with special characters (e.g., `test-project-123`, `auth_system`)
- Empty project name (should be validated upstream, but handle gracefully)
- Very long project names (should work but consider if truncation is needed)
- Concurrent sessions with different projects (ensure no cross-contamination)

---

## Dependencies

### Blocked By
- None (this is a foundational task that other tasks depend on)

### Blocks
- **Task 003-001**: Add --project flag to run command (needs session tagging to work)
- **Task 003-002**: Add --project flag to step command (needs session tagging to work)
- **Task 003-003**: Add --project flag to inspect command (relies on project field for filtering)

---

## Verification Steps

1. **Create tagged session**
   ```bash
   ralphctl run plan --project my-feature
   ```
   Verify `.ralphctl/ralph-sessions.json` contains:
   ```json
   {
     "sessionId": "...",
     "mode": "plan",
     "project": "my-feature",
     ...
   }
   ```

2. **Create untagged session**
   ```bash
   ralphctl run plan
   ```
   Verify session does NOT have a project field or has `project: null`

3. **Read existing session**
   - Copy an old ralph-sessions.json without project fields
   - Run `ralphctl inspect`
   - Verify no errors are thrown

4. **Multiple projects**
   ```bash
   ralphctl run plan --project project-a
   ralphctl run plan --project project-b
   ```
   Verify both sessions are correctly tagged with their respective projects

---

## Technical Guidance

### Naming Convention
Use `project` as the field name (not `projectName`, `projectId`, etc.) for consistency with the `--project` flag naming.

### Data Type
Store as a simple string. Don't create a complex nested object unless there's a clear need for additional project metadata.

### Default Value
Prefer omitting the field entirely for untagged sessions rather than storing `null` or empty string. This keeps the JSON cleaner and more readable. However, TypeScript types should mark it as optional (`project?: string`).

### Future-Proofing
Consider that future enhancements might include:
- Project metadata (created date, description)
- Nested project hierarchies
- Project aliases

Keep the current implementation simple but ensure the data structure can evolve without breaking changes.

---

## Success Metrics

- All new sessions with `--project` flag include project field
- Zero errors when reading sessions without project field
- Session files remain readable and well-formed JSON
- Filtering by project (Task 003-003) works correctly based on this tagging
