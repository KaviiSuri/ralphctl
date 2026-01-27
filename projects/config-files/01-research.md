# Research: config-files

## Problem Statement

Currently, users must repeatedly specify CLI flags like `--smart-model`, `--fast-model`, `--agent` on every command invocation. This is tedious and error-prone. Users need a way to set defaults in a config file that persist across sessions.

**Goal**: Load configuration from both config files and CLI flags, merge them (CLI overrides config), validate the result, and use it for execution.

## Current Setup

- **Runtime**: Bun
- **CLI Framework**: Clerc (v1.2.1)
- **Validation**: Zod (already installed)
- **Entry point**: `src/cli.ts`

### Current Configurable Flags

| Flag | Type | Default |
|------|------|---------|
| `--smart-model` | String | `openai/gpt-5.2-codex` (opencode) / `claude-opus-4-5` (claude-code) |
| `--fast-model` | String | `zai-coding-plan/glm-4.7` (opencode) / `claude-sonnet-4-5` (claude-code) |
| `--agent` | Enum | `opencode` |
| `--max-iterations` | Number | `10` |
| `--permission-posture` | Enum | `allow-all` |

### Current Priority

```
CLI Flags > RALPHCTL_AGENT env var > Hardcoded defaults
```

## Web Research Findings

### Library Comparison

| Feature | c12 (UnJS) | cosmiconfig |
|---------|------------|-------------|
| Native TS support | Yes | Needs loader |
| File formats | TS, JS, JSON, YAML, TOML | JSON, YAML, JS |
| Built-in merging | Yes (via defu) | No (manual) |
| Global + project config | Yes | Yes |
| Bun compatible | Yes | Yes |
| Actively maintained | Yes (UnJS team) | Yes |

### Recommendation: c12

**Why c12:**
1. Native TypeScript support - no extra loader needed
2. Supports JSON and YAML out of the box
3. Built-in deep merging with clear priority (project overrides global)
4. Automatic config file discovery
5. Same ecosystem as Nuxt/Nitro - battle-tested

## Technical Decisions

### Config File Format
**Decision**: JSON primary, YAML also supported
**Rationale**: User preference, both are human-readable and widely understood

### Config File Locations
**Decision**: Both global and project-level, project overrides global

| Priority | Location | Purpose |
|----------|----------|---------|
| 1 (highest) | CLI flags | Per-invocation overrides |
| 2 | `--config <path>` | Explicit config file override |
| 3 | `./.ralphctl.json` | Project-specific defaults |
| 4 | `~/.config/ralphctl/config.json` | Global user defaults |
| 5 (lowest) | Hardcoded defaults | Fallback |

### Config Schema
```typescript
{
  smartModel?: string,
  fastModel?: string,
  agent?: "opencode" | "claude-code",
  maxIterations?: number,
  permissionPosture?: "allow-all" | "ask"
}
```

All fields optional - partial configs allowed from any source.

## Integration Pattern

### Config Loader
```typescript
import { loadConfig } from "c12";
import { z } from "zod";

const ConfigSchema = z.object({
  smartModel: z.string().optional(),
  fastModel: z.string().optional(),
  agent: z.enum(["opencode", "claude-code"]).optional(),
  maxIterations: z.number().optional(),
  permissionPosture: z.enum(["allow-all", "ask"]).optional(),
});

export async function loadAppConfig(
  cliOverrides: Partial<AppConfig> = {},
  configPath?: string
) {
  const { config } = await loadConfig<AppConfig>({
    name: "ralphctl",
    configFile: configPath, // --config flag override
  });

  const merged = {
    ...config,
    ...filterUndefined(cliOverrides),
  };

  return ConfigSchema.parse(merged);
}
```

### Usage in Command Handlers
```typescript
export async function runHandler(options: RunOptions) {
  const config = await loadAppConfig({
    smartModel: options.smartModel,
    fastModel: options.fastModel,
    agent: options.agent,
    maxIterations: options.maxIterations,
    permissionPosture: options.permissionPosture,
  });

  // Use validated config...
}
```

## Constraints

- Must work with Bun runtime
- Must integrate with existing Clerc CLI setup
- Validation must use Zod (already in codebase)
- Partial configs must be allowed from all sources

## Open Questions

None - all decisions made.

## References

- [c12 GitHub](https://github.com/unjs/c12)
- [c12 UnJS Docs](https://unjs.io/packages/c12/)
- [Clerc Docs](https://clerc.js.org/)
