# JTBD-104-SPEC-001: Agent-Aware Session Management

**Parent JTBD**: JTBD-104 - Preserve Inspection and Session Management
**Status**: Not Started
**Priority**: P1 (Core Functionality)
**Depends On**: JTBD-101-SPEC-001, JTBD-102-SPEC-001

---

## Purpose

Extend session state management to track which agent created each session, enabling proper export routing and mixed-agent project support while maintaining backward compatibility.

## Scope

**In Scope**:
- Add `agent` field to session state schema
- Update session write logic to include agent type
- Update inspect command to route exports to correct agent
- Support mixed-agent sessions in single project
- Backward compatibility for existing sessions

**Out of Scope**:
- Session migration between agents
- Cross-agent session continuation
- Agent capability comparison in sessions
- Session replay or re-execution

---

## Behavioral Requirements

### 1. Session State Schema Update

**Extend `RalphSession` type** in `src/domain/types.ts`:

```typescript
export interface RalphSession {
  iteration: number;
  sessionId: string;
  startedAt: string; // ISO timestamp
  mode: Mode;
  prompt: string;
  agent: AgentType; // NEW FIELD
  projectMode?: boolean; // NEW FIELD (optional, for Claude Code)
}

export interface SessionsFile {
  sessions: RalphSession[];
  version?: string; // NEW FIELD for future migrations
}
```

**Version field**:
- Current version: "1.0.0"
- Enables future schema migrations
- Optional for backward compatibility

### 2. Session Write Logic

**Update `writeSessionsFile` in `src/lib/state/index.ts`**:

```typescript
export async function addSession(
  session: RalphSession
): Promise<void> {
  const sessionsFile = await readSessionsFile();

  sessionsFile.sessions.push(session);

  // Set version if not present
  if (!sessionsFile.version) {
    sessionsFile.version = "1.0.0";
  }

  await writeSessionsFile(sessionsFile);
}
```

**Update command handlers** to include agent type:

```typescript
// In run.ts

const session: RalphSession = {
  iteration: i + 1,
  sessionId: result.sessionId!,
  startedAt: new Date().toISOString(),
  mode,
  prompt: resolvedPrompt,
  agent: agentType, // NEW
  projectMode: agentType === AgentType.ClaudeCode ? useProjectMode : undefined, // NEW
};

await addSession(session);
```

### 3. Backward Compatibility

**Handle sessions without `agent` field**:

```typescript
// In src/lib/state/index.ts

export async function readSessionsFile(): Promise<SessionsFile> {
  // ... existing file read logic ...

  const parsed = JSON.parse(content);

  // Migrate old format to new format
  const sessions = parsed.sessions.map((session: any) => ({
    ...session,
    agent: session.agent || AgentType.OpenCode, // Default to OpenCode for old sessions
    projectMode: session.projectMode, // May be undefined
  }));

  return {
    sessions,
    version: parsed.version || "1.0.0",
  };
}
```

**Migration logic**:
- Sessions without `agent` field default to `AgentType.OpenCode`
- No explicit migration step required (lazy migration on read)
- Preserves existing functionality

### 4. Inspect Command Updates

**Update `inspectHandler` in `src/lib/commands/inspect.ts`**:

```typescript
import { createAgent } from "../agents/factory";
import type { AgentAdapter } from "../../domain/agent";

export async function inspectHandler(ctx: {
  flags: { output: string };
}) {
  const { output } = ctx.flags;
  const cwd = process.cwd();

  const sessionsFile = await readSessionsFile();
  const inspectEntries: InspectEntry[] = [];

  // Group sessions by agent type for efficiency
  const sessionsByAgent = new Map<AgentType, RalphSession[]>();
  for (const session of sessionsFile.sessions) {
    const agent = session.agent || AgentType.OpenCode;
    if (!sessionsByAgent.has(agent)) {
      sessionsByAgent.set(agent, []);
    }
    sessionsByAgent.get(agent)!.push(session);
  }

  // Create adapters for each agent type present
  const adapters = new Map<AgentType, AgentAdapter>();
  for (const [agentType, sessions] of sessionsByAgent.entries()) {
    try {
      const adapter = await createAgent({ cwd, agentType });
      adapters.set(agentType, adapter);
    } catch (error) {
      console.warn(
        `Warning: Cannot export sessions for ${agentType} (agent not available)`
      );
      // Continue with other agents
    }
  }

  // Export each session using appropriate adapter
  for (const session of sessionsFile.sessions) {
    const agentType = session.agent || AgentType.OpenCode;
    const adapter = adapters.get(agentType);

    if (!adapter) {
      inspectEntries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: agentType,
        export: null,
        error: `Agent ${agentType} not available`,
      });
      continue;
    }

    try {
      const exportResult = await adapter.export(session.sessionId);
      inspectEntries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: agentType,
        projectMode: session.projectMode,
        export: exportResult.success ? exportResult.exportData : null,
        error: exportResult.success ? undefined : exportResult.error,
      });
    } catch (error) {
      inspectEntries.push({
        sessionId: session.sessionId,
        iteration: session.iteration,
        startedAt: session.startedAt,
        agent: agentType,
        projectMode: session.projectMode,
        export: null,
        error: String(error),
      });
    }
  }

  // Write inspect output
  await writeInspectFile(output, inspectEntries);
  console.log(`Inspection complete: ${inspectEntries.length} sessions exported to ${output}`);
}
```

### 5. Inspect Output Schema

**Update `InspectEntry` type**:

```typescript
export interface InspectEntry {
  sessionId: string;
  iteration: number;
  startedAt: string;
  agent: AgentType; // NEW FIELD
  projectMode?: boolean; // NEW FIELD
  export: unknown | null;
  error?: string;
}
```

**Example output** (`inspect.json`):

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-21T12:00:00Z",
  "entries": [
    {
      "sessionId": "ses_opencode_123",
      "iteration": 1,
      "startedAt": "2026-01-21T11:00:00Z",
      "agent": "opencode",
      "export": { /* OpenCode export data */ }
    },
    {
      "sessionId": "ses_claude_456",
      "iteration": 2,
      "startedAt": "2026-01-21T11:30:00Z",
      "agent": "claude-code",
      "projectMode": true,
      "export": { /* Claude Code export data */ }
    },
    {
      "sessionId": "ses_claude_789",
      "iteration": 3,
      "startedAt": "2026-01-21T12:00:00Z",
      "agent": "claude-code",
      "projectMode": true,
      "export": null,
      "error": "Session not found"
    }
  ]
}
```

---

## Acceptance Criteria

- [ ] `RalphSession` type includes `agent` field
- [ ] `RalphSession` type includes optional `projectMode` field
- [ ] `SessionsFile` includes optional `version` field
- [ ] Session write logic populates agent and projectMode
- [ ] Session read logic handles missing agent field (backward compatibility)
- [ ] Old sessions default to `opencode` agent type
- [ ] Inspect command creates adapters for each agent type
- [ ] Inspect command routes exports to correct agent
- [ ] Inspect command handles missing agents gracefully
- [ ] Inspect output includes agent type per session
- [ ] Inspect output includes projectMode if applicable
- [ ] Mixed-agent sessions are supported in single project
- [ ] Unit tests cover session read/write with new fields
- [ ] Unit tests cover backward compatibility
- [ ] Integration tests verify inspect with mixed agents

---

## Technical Notes

### Design Decisions

1. **Lazy Migration**: Don't require explicit migration step. Transform old sessions on read.

2. **Agent per Session**: Store agent type with each session, not globally. Supports switching agents between iterations (though not recommended).

3. **Versioning**: Add version field to enable future schema migrations without breaking changes.

4. **Graceful Degradation**: If an agent is unavailable during inspection, include error in output rather than failing entirely.

5. **Optional projectMode**: Only populated for Claude Code sessions. Avoids clutter for OpenCode sessions.

### Edge Cases

**Case 1: Mixed agents in one run**
- Not supported by current design (agent selected at run start)
- Session tracking would support it if future spec adds per-iteration agent selection

**Case 2: Agent uninstalled after sessions created**
- Inspect command warns but continues
- Exports null with error message for affected sessions

**Case 3: Session IDs conflict between agents**
- Unlikely (agents use different ID formats)
- If happens, export attempts may fail gracefully

### Migration Strategy

**Phase 1: Add fields with defaults**
- New fields are optional or have defaults
- Old code continues to work
- New code populates new fields

**Phase 2: Update readers**
- Session read logic handles both old and new formats
- Lazy migration on read

**Phase 3: Update writers**
- New sessions include all fields
- Old sessions gradually migrated as they're read

**Phase 4: Deprecation (optional, future)**
- After several versions, require version field
- Reject sessions without version (with clear upgrade message)

### Testing Strategy

**Unit Tests**:
- Session read/write with agent field
- Backward compatibility (read old format)
- Version field handling
- Agent routing in inspect command

**Integration Tests**:
- Create sessions with OpenCode
- Create sessions with Claude Code
- Inspect mixed-agent sessions
- Handle missing agent during inspection

**Manual Testing**:
- Upgrade existing project with old sessions
- Verify old sessions still inspect correctly
- Create new session with Claude Code
- Inspect shows both agent types

---

## Dependencies

- **JTBD-101-SPEC-001**: Agent selection must be implemented
- **JTBD-102-SPEC-001**: AgentAdapter interface must exist
- **JTBD-102-SPEC-002**: Both adapters must implement export()

## Impacts

- **Session format**: Breaking change mitigated by backward compatibility
- **Inspect output**: Breaking change (adds agent field) - users may need to update parsers
- **Documentation**: Must document new session schema

---

## Implementation Checklist

- [ ] Update `RalphSession` type in `src/domain/types.ts`
- [ ] Add `version` field to `SessionsFile` type
- [ ] Update `InspectEntry` type
- [ ] Update `addSession()` in `src/lib/state/index.ts`
- [ ] Update `readSessionsFile()` with migration logic
- [ ] Update `runHandler` to include agent in sessions
- [ ] Update `stepHandler` to include agent in sessions
- [ ] Update `inspectHandler` to create agent-specific adapters
- [ ] Update `inspectHandler` to route exports to correct agent
- [ ] Add graceful error handling for missing agents
- [ ] Update inspect output format with agent field
- [ ] Write unit tests for session read/write
- [ ] Write unit tests for backward compatibility
- [ ] Write integration tests for mixed-agent inspection
- [ ] Update documentation for session schema
- [ ] Update README with inspect output example
