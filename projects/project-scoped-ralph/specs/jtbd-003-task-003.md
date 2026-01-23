# Spec: Add --project flag to inspect command

**Task ID**: 003-003
**JTBD**: JTBD-003 - Project-Scoped Execution
**Dependencies**: 003-005 (Tag sessions with project name)

---

## Purpose

Enable users to filter `ralphctl inspect` output to show only sessions that belong to a specific project. This allows developers to review progress and debug issues within a single project context without being overwhelmed by sessions from other projects or global sessions.

---

## Scope

### In Scope
- Add `--project <name>` flag to `ralphctl inspect` command
- Filter displayed sessions to show only those tagged with the specified project name
- Maintain existing inspect functionality (list view, export format)
- Display appropriate message when no sessions exist for the specified project
- Support export operations (if implemented) scoped to project sessions

### Out of Scope
- Modifying session tagging logic (handled by Task 003-005)
- Changes to global inspect behavior when `--project` is not specified
- Cross-project session analysis or comparison
- Retroactive tagging of existing sessions (they won't have project tags)
- Project validation (whether the project folder exists or not)

---

## Acceptance Criteria

### AC1: Flag Parsing
- `ralphctl inspect --project auth-system` successfully parses the flag
- `--project` flag is optional
- Command accepts project name as a string argument
- Invalid usage (missing project name) shows helpful error message

### AC2: Session Filtering
- When `--project <name>` is specified, only sessions with matching project tag are displayed
- Sessions without a project tag are excluded from project-filtered views
- Filtering respects existing session ordering (most recent first, or existing sort)
- Empty result shows informative message: "No sessions found for project '<name>'"

### AC3: Display Format
- Filtered sessions use the same display format as global inspect
- Project name is visible in session metadata (if displayed)
- All existing inspect output modes work with filtered sessions
- Export functionality (if present) exports only filtered sessions

### AC4: Backwards Compatibility
- `ralphctl inspect` without `--project` flag shows all sessions (unchanged behavior)
- Existing sessions without project tags still appear in global view
- No breaking changes to session storage format

---

## Implementation Notes

### Technical Approach

1. **Command Line Interface**
   - Add `--project` option to inspect command parser
   - Type: optional string
   - Validation: non-empty string (no need to verify project folder exists)

2. **Session Filtering Logic**
   ```
   if --project flag present:
     sessions = all_sessions.filter(s => s.project === project_name)
   else:
     sessions = all_sessions
   ```

3. **Session Structure Reference**
   - Sessions are stored in `.ralphctl/ralph-sessions.json`
   - Each session object should have an optional `project` field (added by Task 003-005)
   - Filter by exact string match on this field

4. **Error Handling**
   - No project sessions found: Display message, exit with code 0 (not an error)
   - Invalid project name format: Show usage help
   - Session file read errors: Handle as existing inspect command does

### Code Locations

Based on ralphctl architecture:
- Command parser: `src/commands/inspect.ts` (or similar)
- Session loading: Shared session utilities
- Display logic: Existing inspect display functions

### Testing Scenarios

1. **Basic filtering**: Create sessions with project tags, verify filtering works
2. **No matches**: Request non-existent project, verify friendly message
3. **Global view**: Run without flag, verify all sessions shown
4. **Mixed sessions**: Sessions with and without project tags, verify filtering is correct
5. **Export scoping**: If export exists, verify it respects project filter

### Display Examples

**With matching sessions:**
```
$ ralphctl inspect --project auth-system

Sessions for project 'auth-system':

Session: auth-system-plan-2026-01-23-14-30
Mode: plan
Project: auth-system
Started: 2026-01-23 14:30:15
Iterations: 5
Status: completed

Session: auth-system-build-2026-01-22-09-15
Mode: build
Project: auth-system
Started: 2026-01-22 09:15:42
Iterations: 12
Status: interrupted
```

**With no matching sessions:**
```
$ ralphctl inspect --project auth-system

No sessions found for project 'auth-system'

Tip: Run 'ralphctl run plan --project auth-system' to start a new session.
```

---

## Verification Steps

1. Create test sessions with project tags (manually edit `.ralphctl/ralph-sessions.json` or run Task 003-005 first)
2. Run `ralphctl inspect --project test-project`
3. Verify only sessions with `project: "test-project"` are displayed
4. Run `ralphctl inspect` without flag
5. Verify all sessions are displayed (project-tagged and untagged)
6. Run `ralphctl inspect --project nonexistent`
7. Verify friendly "no sessions found" message
8. If export is implemented, test `ralphctl inspect --project test-project --export output.json`
9. Verify exported JSON contains only filtered sessions

---

## Dependencies

**Depends On:**
- **Task 003-005**: Tag sessions with project name
  - This task adds the `project` field to session objects
  - Without this, there are no project tags to filter by

**Blocks:**
- None (this is a leaf task)

---

## Notes

- This task focuses purely on read/display operations; it doesn't modify sessions
- Project validation is intentionally omitted to avoid coupling with filesystem state
- The `project` field on sessions is the source of truth, not the project folder existence
- Consider adding a `--all` flag in the future to explicitly show all sessions (redundant now but may be useful for UX clarity)
