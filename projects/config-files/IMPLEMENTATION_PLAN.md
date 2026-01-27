# Config File System - Implementation Complete

## IMPLEMENTATION COMPLETE

All tasks have been successfully completed and tested. The config file system is now fully functional with all 298 tests passing and released as git tag 0.0.32.

## Summary

The config file system allows users to configure ralphctl behavior through configuration files at both global and project levels. The implementation uses c12@3.3.3 for config loading and Zod for schema validation, with 26 comprehensive tests ensuring reliability.

**Key Features**:
- Global config at `~/.config/ralphctl/config.{json,yaml}`
- Project config at `./.ralphctl.{json,yaml,yml}`
- Explicit config files via `--config` flag
- Field-by-field merging with proper priority order
- Custom validation messages and source tracking

**Files Created**:
- `src/lib/config/schema.ts` - Zod schema with validation
- `src/lib/config/loader.ts` - Config loading and merging logic
- `src/lib/config/__tests__/config.test.ts` - Comprehensive test suite

**Files Modified**:
- `src/cli.ts` - Added `--config` flags
- `src/lib/commands/run.ts` - Integrated config loading
- `src/lib/commands/step.ts` - Integrated config loading
- `package.json` - Added c12 dependency

## Configuration Priority

Configuration is merged with the following priority (highest to lowest):
1. CLI flags (direct command-line arguments)
2. `--config` file (explicit config file path)
3. `./.ralphctl.{json,yaml,yml}` (project config in cwd)
4. `~/.config/ralphctl/config.{json,yaml}` (global config)
5. Hardcoded defaults in application

## Important Discovery

**c12 does NOT natively support `~/.config/{name}/config.json` pattern**. We implemented manual global and project config loading to avoid package resolution errors. This ensures the config system works reliably across different environments.

## Known Edge Cases and Considerations

### Agent-Specific Model Defaults
Config file models apply to ALL agents. If user sets `smartModel` in config, it applies to both opencode and claude-code. Users can use project-specific configs for different models per agent.

### Permission Posture Handling
Global config can set default permission posture, but this is a security-sensitive setting. Consider restricting `allow-all` to project-specific configs only.

### Config File Format Detection
Supported formats:
- Project: `.ralphctl.json`, `.ralphctl.yaml`, `.ralphctl.yml`
- Global: `~/.config/ralphctl/config.json`, `~/.config/ralphctl/config.yaml`

### Project Scoping
Config files are loaded relative to cwd, not project directory. When using `--project <name>`, config is loaded from cwd, not `projects/<name>/`. Consider loading project config from `projects/<name>/.ralphctl.json` in future.
