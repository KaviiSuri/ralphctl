# JTBD-101-SPEC-001: CLI Agent Selection

**Parent JTBD**: JTBD-101 - Choose My Preferred Agent Backend
**Status**: Not Started
**Priority**: P0 (Core Feature)
**Depends On**: JTBD-102-SPEC-001, JTBD-102-SPEC-002

---

## Purpose

Enable users to select their preferred AI agent (OpenCode or Claude Code) via CLI flags, environment variables, or defaults, with clear error messages when the selected agent is unavailable.

## Scope

**In Scope**:
- `--agent` flag for run and step commands
- `RALPHCTL_AGENT` environment variable
- Default agent selection (OpenCode)
- Agent availability validation
- Error messaging for unavailable agents
- Agent factory pattern

**Out of Scope**:
- Configuration files or persistent settings
- Auto-detection of "best" agent
- Per-project agent configuration files
- Agent capability negotiation

---

## Behavioral Requirements

### 1. CLI Flag

**Add `--agent` flag to run and step commands**:

```typescript
// In src/cli.ts

.command("run", "Run a Ralph loop", {
  parameters: [{ key: "<mode>", type: Types.Enum(Mode.Plan, Mode.Build) }],
  flags: {
    "max-iterations": { /* existing */ },
    "permission-posture": { /* existing */ },
    "smart-model": { /* existing */ },
    "fast-model": { /* existing */ },
    agent: {
      type: Types.Enum("opencode", "claude-code"),
      default: "opencode",
      description: "AI agent to use (opencode or claude-code)",
    },
  },
})
```

```typescript
.command("step", "Run a single iteration", {
  parameters: [
    { key: "<mode>", type: Types.Enum(Mode.Plan, Mode.Build) },
    { key: "[prompt]", type: Types.String },
  ],
  flags: {
    "permission-posture": { /* existing */ },
    "smart-model": { /* existing */ },
    "fast-model": { /* existing */ },
    agent: {
      type: Types.Enum("opencode", "claude-code"),
      default: "opencode",
      description: "AI agent to use (opencode or claude-code)",
    },
  },
})
```

**Validation**: Clerc validates against enum, rejects invalid values automatically.

### 2. Environment Variable

**Support `RALPHCTL_AGENT` environment variable**:

**Priority**: Environment variable is overridden by CLI flag.

**Resolution order**:
1. CLI flag `--agent` (highest priority)
2. Environment variable `RALPHCTL_AGENT`
3. Default: "opencode" (lowest priority)

**Implementation**:
```typescript
// In src/lib/agents/factory.ts

function resolveAgentType(cliAgent?: string): AgentType {
  if (cliAgent) {
    return cliAgent as AgentType;
  }

  const envAgent = process.env.RALPHCTL_AGENT;
  if (envAgent === "opencode" || envAgent === "claude-code") {
    return envAgent as AgentType;
  }

  return AgentType.OpenCode; // Default
}
```

### 3. Agent Factory

**Create agent factory** at `src/lib/agents/factory.ts`:

```typescript
import { AgentAdapter, AgentType } from "../../domain/agent";
import { OpenCodeAdapter } from "./opencode-adapter";
import { ClaudeCodeAdapter } from "./claude-code-adapter";

export interface CreateAgentOptions {
  cwd: string;
  agentType?: AgentType;
  useProjectMode?: boolean; // For Claude Code
}

export async function createAgent(
  options: CreateAgentOptions
): Promise<AgentAdapter> {
  const agentType = options.agentType || AgentType.OpenCode;

  let adapter: AgentAdapter;

  switch (agentType) {
    case AgentType.OpenCode:
      adapter = new OpenCodeAdapter(options.cwd);
      break;

    case AgentType.ClaudeCode:
      adapter = new ClaudeCodeAdapter(
        options.cwd,
        options.useProjectMode ?? true
      );
      break;

    default:
      throw new Error(`Unsupported agent type: ${agentType}`);
  }

  // Validate availability
  const available = await adapter.checkAvailability();
  if (!available) {
    const metadata = adapter.getMetadata();
    throw new AgentUnavailableError(
      `${metadata.displayName} (${metadata.cliCommand}) is not available.\n` +
        `Please install ${metadata.displayName} and ensure it's in your PATH.\n` +
        `Visit: ${getInstallationUrl(agentType)}`
    );
  }

  return adapter;
}

export class AgentUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentUnavailableError";
  }
}

function getInstallationUrl(agentType: AgentType): string {
  switch (agentType) {
    case AgentType.OpenCode:
      return "https://opencode.ai/download";
    case AgentType.ClaudeCode:
      return "https://claude.com/claude-code";
    default:
      return "";
  }
}
```

### 4. Command Handler Updates

**Update run.ts**:

```typescript
// In src/lib/commands/run.ts

import { createAgent } from "../agents/factory";
import { resolveAgentType } from "../agents/factory";

export async function runHandler(ctx: {
  parameters: { mode: Mode };
  flags: {
    "max-iterations": number;
    "permission-posture": PermissionPosture;
    "smart-model": string;
    "fast-model": string;
    agent: string;
  };
}) {
  const { mode } = ctx.parameters;
  const {
    "max-iterations": maxIterations,
    "permission-posture": permissionPosture,
    "smart-model": smartModel,
    "fast-model": fastModel,
    agent: agentFlag,
  } = ctx.flags;

  const cwd = process.cwd();
  const agentType = resolveAgentType(agentFlag);

  // Create agent (validates availability)
  let adapter: AgentAdapter;
  try {
    adapter = await createAgent({
      cwd,
      agentType,
      useProjectMode: mode === Mode.Build, // Enable project mode for build
    });
  } catch (error) {
    if (error instanceof AgentUnavailableError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  console.log(`Using ${adapter.getMetadata().displayName}`);

  // Rest of existing logic, using adapter instead of OpenCodeAdapter
  // ...
}
```

**Update step.ts** similarly.

### 5. Error Messaging

**When agent is unavailable**:

```
Error: Claude Code (claude) is not available.
Please install Claude Code and ensure it's in your PATH.
Visit: https://claude.com/claude-code
```

**When invalid agent is specified**:
- Clerc handles validation automatically
- Shows: `Error: Invalid value for --agent. Expected opencode or claude-code, received: foo`

**When agent fails during execution**:
- Propagate agent-specific error messages
- Include agent name in error context

---

## Acceptance Criteria

- [ ] `--agent` flag added to run and step commands
- [ ] Flag accepts "opencode" or "claude-code"
- [ ] Default value is "opencode"
- [ ] `RALPHCTL_AGENT` environment variable is respected
- [ ] CLI flag overrides environment variable
- [ ] Agent factory created with availability validation
- [ ] Clear error message when agent is unavailable
- [ ] Error message includes installation URL
- [ ] Command handlers use factory to create agents
- [ ] Agent type is resolved in priority order (flag > env > default)
- [ ] Unit tests cover agent resolution logic
- [ ] Unit tests cover factory creation and error handling
- [ ] Integration tests verify both agents can be selected

---

## Technical Notes

### Design Decisions

1. **No Configuration File**: Keep it simple - use CLI flags and env vars only. Avoids complexity of config file parsing and precedence rules.

2. **Eager Validation**: Check agent availability immediately during factory creation. Fail fast with clear error messages.

3. **Factory Pattern**: Centralize agent creation logic to ensure consistent validation and configuration.

4. **Project Mode Auto-Enable**: Automatically enable Claude Code project mode for build mode (can be overridden in future spec).

### User Experience

**Good UX**:
```bash
$ rctl run build --agent claude-code
Using Claude Code
--- Iteration 1/10 (Session: ses_xyz) ---
...
```

**Bad UX (prevented)**:
```bash
$ rctl run build --agent claude-code
Error: Command 'claude' not found
# ^ Unclear what went wrong or how to fix
```

**Our UX**:
```bash
$ rctl run build --agent claude-code
Error: Claude Code (claude) is not available.
Please install Claude Code and ensure it's in your PATH.
Visit: https://claude.com/claude-code
# ^ Clear problem, clear solution, clear next step
```

### Backward Compatibility

**Existing behavior preserved**:
- Default agent is OpenCode (no breaking changes)
- Existing commands work without --agent flag
- Existing scripts/CI continue to work
- OpenCodeAdapter refactored but behavior unchanged

### Future Extensibility

This design supports:
- Adding new agents (extend enum, add factory case)
- Configuration files (add to resolution order)
- Per-project agent selection (read from `.ralphctlrc`)
- Agent plugins (dynamic loading)

---

## Dependencies

- **JTBD-102-SPEC-001**: AgentAdapter interface
- **JTBD-102-SPEC-002**: ClaudeCodeAdapter implementation
- OpenCodeAdapter refactored to implement AgentAdapter

## Impacts

- **All command handlers** (`run.ts`, `step.ts`) updated to use factory
- **JTBD-104-SPEC-001**: Session management must track agent type
- **JTBD-105-SPEC-001**: Model resolution becomes agent-aware

---

## Implementation Checklist

- [ ] Create `src/lib/agents/factory.ts`
- [ ] Implement `resolveAgentType()` function
- [ ] Implement `createAgent()` factory function
- [ ] Implement `AgentUnavailableError` class
- [ ] Implement `getInstallationUrl()` helper
- [ ] Add `--agent` flag to `run` command in `cli.ts`
- [ ] Add `--agent` flag to `step` command in `cli.ts`
- [ ] Update `runHandler` in `run.ts`
- [ ] Update `stepHandler` in `step.ts`
- [ ] Write unit tests for factory
- [ ] Write unit tests for agent resolution
- [ ] Write integration tests for agent selection
- [ ] Update README with --agent flag usage
