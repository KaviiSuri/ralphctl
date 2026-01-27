# Spec: 001-004 - Add --config flag to all commands in cli.ts

## JTBD Reference
JTBD-001: Config File Discovery and Loading

## Purpose
Add a `--config <path>` flag to all existing commands in cli.ts to allow users to explicitly specify a custom config file path. This enables per-invocation config file overrides beyond the auto-discovered global and project config files. The flag will be passed through to the config loader module created in 001-003.

## Scope
### In Scope
- Add `--config` flag definition to the Clerc CLI setup in cli.ts
- Apply the flag to all existing commands (not just specific ones)
- Pass the `--config` value to the config loader when initializing AppConfig in each command handler
- Support both absolute and relative paths
- Ensure the flag is properly typed and documented in command help text

### Out of Scope
- Creating or scaffolding config files
- Interactive config editing
- Config validation (handled by 001-003)
- Environment variable support for config path
- Default config file discovery (handled by 001-003)

## Acceptance Criteria
- [ ] `--config` flag is defined in Clerc with proper type (string) and help text
- [ ] `--config` flag is available on all commands in cli.ts
- [ ] Each command handler extracts the `--config` value from options
- [ ] Config loader receives the `--config` path via the `configPath` parameter
- [ ] Explicit `--config` file takes priority over auto-discovered files
- [ ] Help text or documentation shows the flag is available
- [ ] No breaking changes to existing command behavior when flag is not used
- [ ] No errors when `--config` is not provided (flag is optional)

## Implementation Notes

### Clerc Flag Definition
Define the flag using Clerc's flag API. The flag should be:
- Type: string
- Required: no (optional)
- Description: something like "Path to custom config file (overrides auto-discovered files)"
- Suggestion: Use camelCase property name `config` in the options object

Example pattern (from Clerc docs):
```typescript
clerc
  .command('run')
  .string('config', { description: 'Path to custom config file' })
  .action((options) => runHandler(options))
```

### Passing to Handlers
In each command handler, pass the config path to the config loader:

```typescript
export async function runHandler(options: RunOptions) {
  const config = await loadAppConfig(
    {
      smartModel: options.smartModel,
      fastModel: options.fastModel,
      agent: options.agent,
      maxIterations: options.maxIterations,
      permissionPosture: options.permissionPosture,
    },
    options.config  // <-- Pass the --config flag value
  );
  // ... rest of handler
}
```

Note: `options.config` will be `undefined` if the flag is not provided, which is the correct behavior for optional flags.

### Type Safety
Ensure TypeScript properly types the options parameter. If `RunOptions` interface doesn't already include `config?: string`, add it:

```typescript
interface RunOptions {
  smartModel?: string;
  fastModel?: string;
  agent?: string;
  maxIterations?: number;
  permissionPosture?: string;
  config?: string;  // <-- Add this
}
```

## Dependencies
- Depends on: 001-003 (config loader module must exist with loadAppConfig function)
- Blocks: None
