# JTBD-103-SPEC-001: Claude Code Print Mode Configuration

**Parent JTBD**: JTBD-103 - Configure Claude Code Print Mode
**Status**: Not Started
**Priority**: P1 (Feature Differentiator)
**Depends On**: JTBD-102-SPEC-002, JTBD-101-SPEC-001

---

## Purpose

Enable Claude Code's print mode (`-p` / `--print` flag) by default for headless execution while allowing users to disable it when needed. Print mode makes Claude Code print response and exit (useful for pipes), and skips the workspace trust dialog.

## Scope

**In Scope**:
- Automatic print mode enablement for headless runs with Claude Code
- `--no-print` flag to disable print mode
- Documentation of print mode semantics and trust implications
- Mode mapping (plan vs build)

**Out of Scope**:
- Custom trust dialog configuration
- Print mode for OpenCode (doesn't exist)
- Workspace trust boundary configuration
- Performance optimization of print mode

---

## Behavioral Requirements

### 1. Default Behavior

**When using Claude Code**:

| rctl Mode | Print Mode (`-p`) | Rationale |
|-----------|-------------------|-----------|
| `build` | **Enabled** | Headless execution, skips trust dialog for faster automation |
| `plan` | **Enabled** | Headless execution, skips trust dialog for faster automation |

**Important Security Note**:
- Print mode skips workspace trust dialog
- Only use in directories you trust
- rctl assumes users run it in trusted project directories

**When using OpenCode**:
- Print mode flag is ignored (OpenCode doesn't support it)
- No error or warning (silent no-op)

### 2. Override Flag

**Add `--no-print` flag** to run and step commands:

```typescript
// In src/cli.ts

.command("run", "Run a Ralph loop", {
  parameters: [{ key: "<mode>", type: Types.Enum(Mode.Plan, Mode.Build) }],
  flags: {
    // ... existing flags ...
    agent: { /* from JTBD-101-SPEC-001 */ },
    "no-print": {
      type: Types.Boolean,
      default: false,
      description: "Disable Claude Code print mode (shows interactive prompts)",
    },
  },
})
```

**Behavior**:
- When `--no-print` is passed, Claude Code runs without `-p` flag
- Without `-p`, Claude Code may show trust dialogs and interactive prompts
- Only affects Claude Code (no-op for other agents)
- Applies to all iterations in a run command
- Applies to the single iteration in a step command

### 3. Factory Integration

**Update `createAgent` in factory.ts**:

```typescript
export interface CreateAgentOptions {
  cwd: string;
  agentType?: AgentType;
  headless?: boolean; // Defaults to true (enables -p for Claude Code)
}

export async function createAgent(
  options: CreateAgentOptions
): Promise<AgentAdapter> {
  const agentType = options.agentType || AgentType.OpenCode;
  const headless = options.headless ?? true; // Default: enabled

  let adapter: AgentAdapter;

  switch (agentType) {
    case AgentType.OpenCode:
      adapter = new OpenCodeAdapter(options.cwd);
      // OpenCode doesn't support print mode - headless ignored
      break;

    case AgentType.ClaudeCode:
      adapter = new ClaudeCodeAdapter({ cwd: options.cwd, headless });
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
    "no-print": boolean;
  };
}) {
  const { mode } = ctx.parameters;
  const {
    // ... existing destructuring ...
    agent: agentFlag,
    "no-print": noPrint,
  } = ctx.flags;

  const agentType = resolveAgentType(agentFlag);
  const headless = !noPrint; // Invert flag

  const adapter = await createAgent({
    cwd,
    agentType,
    headless,
  });

  // Log print mode status if Claude Code
  if (agentType === AgentType.ClaudeCode) {
    console.log(
      `Print mode: ${headless ? "enabled" : "disabled"}`
    );
  }

  // ... rest of handler ...
}
```

### 5. Documentation in Prompts

**Update template prompts** to mention print mode:

**In PROMPT_build.md**:
```markdown
# Build Mode Prompt

> **Note**: If using Claude Code in print mode (default), responses are streamed
> directly without interactive prompts. The workspace trust dialog is skipped.
> Only run rctl in directories you trust.

## Instructions
[... existing instructions ...]
```

**In PROMPT_plan.md**:
```markdown
# Plan Mode Prompt

> **Note**: If using Claude Code in print mode (default), responses are streamed
> directly without interactive prompts. The workspace trust dialog is skipped.
> Only run rctl in directories you trust.

## Instructions
[... existing instructions ...]
```

---

## Acceptance Criteria

- [ ] Print mode is enabled by default for Claude Code (both plan and build)
- [ ] `--no-print` flag added to run and step commands
- [ ] Flag correctly disables print mode for Claude Code
- [ ] Flag is no-op for OpenCode (no errors or warnings)
- [ ] Factory accepts `headless` parameter
- [ ] ClaudeCodeAdapter respects headless setting
- [ ] Command handlers pass headless to factory
- [ ] Print mode status is logged when using Claude Code
- [ ] Template prompts mention print mode and security implications
- [ ] Unit tests verify print mode flag handling
- [ ] Integration tests verify `-p` flag is/isn't present in commands
- [ ] Documentation explains when to disable print mode

---

## Technical Notes

### Design Decisions

1. **Enabled by Default**: Print mode makes automation faster by skipping trust dialogs. Assumes users run rctl in trusted directories.

2. **Negative Flag (`--no-print`)**: Follows convention for boolean flags where the default is true. Users opt-out rather than opt-in.

3. **Consistent Across Modes**: Both plan and build use print mode for consistent headless execution.

4. **Per-Invocation Setting**: Print mode is set per command invocation, not persisted. Users can experiment easily.

### Print Mode Semantics (from Claude Code docs)

**What `-p` / `--print` does in Claude Code**:
- Prints response and exits (useful for pipes)
- Skips workspace trust dialog
- **Security note**: Only use in directories you trust
- Enables headless/non-interactive execution

**When to disable print mode**:
- When you want to see trust dialogs
- When running in untrusted directories
- When you want interactive prompts
- For debugging or development

### Performance Considerations

**With print mode** (default):
- Faster execution (no trust dialog pauses)
- Direct output streaming
- Better for automation and CI/CD
- Assumes trusted environment

**Without print mode**:
- Shows trust dialog for workspace
- Interactive prompts may appear
- Better for interactive debugging
- Safer for untrusted directories

### User Communication

**Example console output**:

```bash
$ rctl run build --agent claude-code
Using Claude Code
Print mode: enabled
--- Iteration 1/10 (Session: ses_abc) ---
...
```

```bash
$ rctl run build --agent claude-code --no-print
Using Claude Code
Print mode: disabled
--- Iteration 1/10 (Session: ses_abc) ---
[Trust dialog may appear]
...
```

### Future Enhancements

This design supports future extensions:
- Per-project defaults (`.ralphctlrc` with `headless: false`)
- Print mode for other agents if they add support
- Trust boundary configuration
- Automatic trust detection

---

## Dependencies

- **JTBD-102-SPEC-002**: ClaudeCodeAdapter must support headless constructor param
- **JTBD-101-SPEC-001**: Agent factory must exist

## Impacts

- **Template prompts**: Updated to mention print mode and security
- **Documentation**: Must explain print mode and trust implications
- **JTBD-104-SPEC-001**: Session metadata should track whether print mode was used

---

## Implementation Checklist

- [x] Research Claude Code `-p` flag behavior (confirmed: print mode)
- [ ] Add `--no-print` flag to `run` command in `cli.ts`
- [ ] Add `--no-print` flag to `step` command in `cli.ts`
- [ ] Update `CreateAgentOptions` in `factory.ts` (use `headless` parameter)
- [ ] Update factory to pass headless to ClaudeCodeAdapter
- [ ] Update `runHandler` to handle `--no-print` flag
- [ ] Update `stepHandler` to handle `--no-print` flag
- [ ] Add print mode status logging
- [ ] Update `PROMPT_build.md` template
- [ ] Update `PROMPT_plan.md` template
- [ ] Write unit tests for flag handling
- [ ] Write integration tests for print mode flag presence
- [ ] Document print mode in README
- [ ] Document security implications and trust
- [ ] Update `init` command templates if needed
