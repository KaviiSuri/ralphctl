# JTBD-103-SPEC-001: Claude Code Project Mode Configuration

**Parent JTBD**: JTBD-103 - Configure Claude Code Project Mode
**Status**: Not Started
**Priority**: P1 (Feature Differentiator)
**Depends On**: JTBD-102-SPEC-002, JTBD-101-SPEC-001

---

## Purpose

Enable Claude Code's project mode (`-p` flag) by default for build operations while allowing users to disable it when needed, ensuring context-aware development with proper session isolation.

## Scope

**In Scope**:
- Automatic project mode enablement for build mode with Claude Code
- `--no-project-mode` flag to disable project mode
- Documentation of project mode semantics and trade-offs
- Mode mapping (plan vs build)

**Out of Scope**:
- Custom project mode configuration (beyond enable/disable)
- Project mode for OpenCode (doesn't exist)
- Project boundary detection or validation
- Performance optimization of project mode

---

## Behavioral Requirements

### 1. Default Behavior

**When using Claude Code**:

| rctl Mode | Project Mode | Rationale |
|-----------|--------------|-----------|
| `build` | **Enabled** (`-p` flag) | Build mode makes code changes; needs full project context for quality |
| `plan` | **Enabled** (`-p` flag) | Plan mode analyzes codebase; benefits from project structure understanding |

**When using OpenCode**:
- Project mode flag is ignored (OpenCode doesn't support it)
- No error or warning (silent no-op)

### 2. Override Flag

**Add `--no-project-mode` flag** to run and step commands:

```typescript
// In src/cli.ts

.command("run", "Run a Ralph loop", {
  parameters: [{ key: "<mode>", type: Types.Enum(Mode.Plan, Mode.Build) }],
  flags: {
    // ... existing flags ...
    agent: { /* from JTBD-101-SPEC-001 */ },
    "no-project-mode": {
      type: Types.Boolean,
      default: false,
      description: "Disable Claude Code project mode (faster but less context)",
    },
  },
})
```

**Behavior**:
- When `--no-project-mode` is passed, Claude Code runs without `-p` flag
- Only affects Claude Code (no-op for other agents)
- Applies to all iterations in a run command
- Applies to the single iteration in a step command

### 3. Factory Integration

**Update `createAgent` in factory.ts**:

```typescript
export interface CreateAgentOptions {
  cwd: string;
  agentType?: AgentType;
  useProjectMode?: boolean; // Defaults to true
}

export async function createAgent(
  options: CreateAgentOptions
): Promise<AgentAdapter> {
  const agentType = options.agentType || AgentType.OpenCode;
  const useProjectMode = options.useProjectMode ?? true; // Default: enabled

  let adapter: AgentAdapter;

  switch (agentType) {
    case AgentType.OpenCode:
      adapter = new OpenCodeAdapter(options.cwd);
      // OpenCode doesn't support project mode - useProjectMode ignored
      break;

    case AgentType.ClaudeCode:
      adapter = new ClaudeCodeAdapter(options.cwd, useProjectMode);
      break;

    default:
      throw new Error(`Unsupported agent type: ${agentType}`);
  }

  // ... rest of availability validation ...
}
```

### 4. Command Handler Updates

**Update run.ts and step.ts**:

```typescript
export async function runHandler(ctx: {
  parameters: { mode: Mode };
  flags: {
    // ... existing flags ...
    agent: string;
    "no-project-mode": boolean;
  };
}) {
  const { mode } = ctx.parameters;
  const {
    // ... existing destructuring ...
    agent: agentFlag,
    "no-project-mode": noProjectMode,
  } = ctx.flags;

  const agentType = resolveAgentType(agentFlag);
  const useProjectMode = !noProjectMode; // Invert flag

  const adapter = await createAgent({
    cwd,
    agentType,
    useProjectMode,
  });

  // Log project mode status if Claude Code
  if (agentType === AgentType.ClaudeCode) {
    console.log(
      `Project mode: ${useProjectMode ? "enabled" : "disabled"}`
    );
  }

  // ... rest of handler ...
}
```

### 5. Documentation in Prompts

**Update template prompts** to mention project mode:

**In PROMPT_build.md**:
```markdown
# Build Mode Prompt

> **Note**: If using Claude Code with project mode enabled (default), you have
> full access to project structure and context. Use this to understand relationships
> between files and maintain consistency.

## Instructions
[... existing instructions ...]
```

**In PROMPT_plan.md**:
```markdown
# Plan Mode Prompt

> **Note**: If using Claude Code with project mode enabled (default), leverage
> project context for comprehensive planning. Understand dependencies and
> architectural patterns.

## Instructions
[... existing instructions ...]
```

---

## Acceptance Criteria

- [ ] Project mode is enabled by default for Claude Code (both plan and build)
- [ ] `--no-project-mode` flag added to run and step commands
- [ ] Flag correctly disables project mode for Claude Code
- [ ] Flag is no-op for OpenCode (no errors or warnings)
- [ ] Factory accepts `useProjectMode` parameter
- [ ] ClaudeCodeAdapter respects useProjectMode setting
- [ ] Command handlers pass useProjectMode to factory
- [ ] Project mode status is logged when using Claude Code
- [ ] Template prompts mention project mode behavior
- [ ] Unit tests verify project mode flag handling
- [ ] Integration tests verify `-p` flag is/isn't present in commands
- [ ] Documentation explains when to disable project mode

---

## Technical Notes

### Design Decisions

1. **Enabled by Default**: Project mode improves code quality and planning accuracy. The performance cost is worth the benefit for most use cases.

2. **Negative Flag (`--no-project-mode`)**: Follows convention for boolean flags where the default is true. Users opt-out rather than opt-in.

3. **Consistent Across Modes**: Both plan and build use project mode. This simplifies mental model and reduces configuration complexity.

4. **Per-Invocation Setting**: Project mode is set per command invocation, not persisted. Users can experiment easily.

### Project Mode Semantics

**What `-p` does in Claude Code** (research needed):
- Scans project directory for structure and files
- Maintains awareness of project boundaries
- Uses project context for better code suggestions
- May increase initial latency for first iteration

**When to disable project mode**:
- Very large projects (>10k files) where scanning is slow
- Single-file changes with no dependencies
- Quick prototyping or experimentation
- CI environments where speed is critical

### Performance Considerations

**With project mode**:
- First iteration may be slower (project scanning)
- Subsequent iterations may be faster (cached context)
- Higher memory usage

**Without project mode**:
- Faster startup
- Less context-aware responses
- May require more explicit prompting

### User Communication

**Example console output**:

```bash
$ rctl run build --agent claude-code
Using Claude Code
Project mode: enabled
--- Iteration 1/10 (Session: ses_abc) ---
...
```

```bash
$ rctl run build --agent claude-code --no-project-mode
Using Claude Code
Project mode: disabled
--- Iteration 1/10 (Session: ses_abc) ---
...
```

### Future Enhancements

This design supports future extensions:
- Per-project defaults (`.ralphctlrc` with `projectMode: false`)
- Project mode for other agents if they add support
- Custom project boundaries (`--project-root` flag)
- Project mode caching or persistence

---

## Dependencies

- **JTBD-102-SPEC-002**: ClaudeCodeAdapter must support project mode constructor param
- **JTBD-101-SPEC-001**: Agent factory must exist

## Impacts

- **Template prompts**: Updated to mention project mode
- **Documentation**: Must explain project mode and when to disable
- **JTBD-104-SPEC-001**: Session metadata should track whether project mode was used

---

## Implementation Checklist

- [ ] Research Claude Code `-p` flag behavior and semantics
- [ ] Add `--no-project-mode` flag to `run` command in `cli.ts`
- [ ] Add `--no-project-mode` flag to `step` command in `cli.ts`
- [ ] Update `CreateAgentOptions` in `factory.ts`
- [ ] Update factory to pass useProjectMode to ClaudeCodeAdapter
- [ ] Update `runHandler` to handle `--no-project-mode` flag
- [ ] Update `stepHandler` to handle `--no-project-mode` flag
- [ ] Add project mode status logging
- [ ] Update `PROMPT_build.md` template
- [ ] Update `PROMPT_plan.md` template
- [ ] Write unit tests for flag handling
- [ ] Write integration tests for project mode flag presence
- [ ] Document project mode in README
- [ ] Document when to disable project mode
- [ ] Update `init` command templates if needed
