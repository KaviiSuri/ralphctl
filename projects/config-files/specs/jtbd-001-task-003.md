# Spec: 001-003 - Create config loader module with c12 integration

## JTBD Reference
JTBD-001: Config File Discovery and Loading

## Purpose
Build the core config loader module that uses c12 to automatically discover and load configuration files from multiple locations (global and project-level) with proper priority handling. This module will support both auto-discovered files and explicit config file specification via the `--config` flag.

## Scope
### In Scope
- Create a new `src/lib/config-loader.ts` module
- Implement `loadAppConfig()` function using c12's `loadConfig()`
- Support automatic discovery of:
  - `~/.config/ralphctl/config.json` (global config)
  - `./.ralphctl.json` (project config)
- Support explicit config file via `configFile` parameter (for `--config` flag)
- Use Zod schema defined in 001-002 for validation
- Return fully validated AppConfig object
- Handle missing auto-discovered files gracefully (no error)
- Error on missing explicit `--config` file
- Support JSON and YAML file formats via c12

### Out of Scope
- Adding `--config` flag to CLI commands (handled in 001-004)
- Implementing merge logic with priority ordering (handled in 002-002)
- Custom error messages for validation failures (handled in 003-001)
- Source tracking for error reporting (handled in 003-002)
- Writing integration tests (handled in 003-003)

## Acceptance Criteria
- [ ] Module exports `loadAppConfig(cliOverrides?: Partial<AppConfig>, configFile?: string)` function
- [ ] Function accepts optional `cliOverrides` parameter for CLI flag values
- [ ] Function accepts optional `configFile` parameter for explicit config file path
- [ ] c12 is configured to auto-discover files with `name: "ralphctl"`
- [ ] Global config location defaults to `~/.config/ralphctl/config.json`
- [ ] Project config location defaults to `./.ralphctl.json`
- [ ] Auto-discovered missing files are silently ignored
- [ ] Explicit `--config` file paths that don't exist throw an error
- [ ] Loaded config is validated against the Zod schema from 001-002
- [ ] Function returns a fully typed AppConfig object
- [ ] Module passes TypeScript compilation with no errors
- [ ] Module works with Bun runtime (no Node.js-specific dependencies)

## Implementation Notes

### c12 Integration
Use c12's `loadConfig()` to handle automatic file discovery and loading:

```typescript
import { loadConfig } from "c12";
import { configSchema, type AppConfig } from "./config-schema"; // from 001-002

export async function loadAppConfig(
  cliOverrides: Partial<AppConfig> = {},
  configFile?: string
): Promise<AppConfig> {
  const { config } = await loadConfig<Partial<AppConfig>>({
    name: "ralphctl",
    configFile: configFile, // --config flag override
  });

  // config will be the merged result from auto-discovered files
  // (global > project > defaults handled by c12)
  const merged = {
    ...config,
    ...cliOverrides, // CLI flags override config files
  };

  return configSchema.parse(merged);
}
```

### Config File Locations
c12 will automatically check these locations in order:

1. **Explicit config file**: `configFile` parameter (if provided via `--config` flag)
   - Must exist or error
2. **Project config**: `./.ralphctl.json` or `./.ralphctl.yaml`
   - Silently ignored if missing
3. **Global config**: `~/.config/ralphctl/config.json` or `~/.config/ralphctl/config.yaml`
   - Silently ignored if missing

### Config File Merging
- c12 handles merging of auto-discovered files
- Explicit `configFile` takes precedence if provided
- CLI overrides (via `cliOverrides` parameter) are applied after all file merging
- Only non-undefined values from `cliOverrides` should override file values

### Config Schema
The Zod schema should validate:
- `smartModel?: string`
- `fastModel?: string`
- `agent?: "opencode" | "claude-code"`
- `maxIterations?: number`
- `permissionPosture?: "allow-all" | "ask"`

All fields are optional (partial configs allowed).

### Error Handling
- If an explicit `configFile` is provided but doesn't exist, c12 will throw an error
- If config values fail Zod validation, the error will be caught and should be meaningful
- Don't mask validation errors - let Zod's validation errors propagate

## Dependencies
- Depends on: 001-001 (c12 dependency installed), 001-002 (Zod schema defined)
- Blocks: 001-004 (adding `--config` flag to commands), 002-001 (CLI flag filtering)
