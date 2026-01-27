# Spec: 003-002 - Add source tracking to report which file caused errors

## JTBD Reference
JTBD-003: Config Validation and Error Handling

## Purpose
Enable error messages to identify which specific config file (global, project, or custom) caused validation errors. This allows users to quickly locate and fix configuration issues without guessing which file needs to be corrected.

## Scope

### In Scope
- Track the source file path for each config value during loading
- Enhance Zod validation error messages to include the source file path
- Differentiate errors from global config, project config, and custom config files
- Report the full file path where the error originated
- Handle cases where multiple files contribute to the final config (report which file caused the conflict/error)

### Out of Scope
- Creating new config files automatically
- Interactive config editing or repair
- Warnings for non-critical issues (only errors)
- Support for file formats beyond JSON/YAML already implemented in 001-003

## Acceptance Criteria
- [ ] Config loader tracks source file for each loaded configuration object
- [ ] Zod schema validation includes source file context in error messages
- [ ] Error format clearly identifies the source file (e.g., "~/.config/ralphctl/config.json: agent must be 'opencode' or 'claude-code'")
- [ ] Global config file errors are reported with `~/.config/ralphctl/config.json` path
- [ ] Project config file errors are reported with `./.ralphctl.json` path
- [ ] Custom config file (via `--config`) errors are reported with the specified path
- [ ] When a field is invalid after merging, the error identifies which source file defined the problematic value
- [ ] Error messages remain user-friendly and actionable

## Implementation Notes

### Technical Approach
1. **Source Tracking**: Modify the config loader to associate metadata with each loaded config object indicating its source file path
2. **Error Enhancement**: When Zod validation fails, parse the error context and append the source file information
3. **Merge Tracking**: During the merge process (implemented in 002-002), maintain a mapping of which source file contributed each field value
4. **Error Reporting**: When validation fails, use the merge tracking map to identify which source file defined the problematic field

### Key Design Points
- Source tracking should be lightweight and not impact performance significantly
- The error message should include the source file path before the validation error message
- If a field is invalid in the final merged config but came from multiple sources, report the highest-priority source (CLI > custom > project > global)
- Global config files are auto-discovered and should use the full path `~/.config/ralphctl/config.json` in error messages

### Integration with Previous Tasks
- Builds on 003-001: Custom error messages from Zod validation
- Works with 002-002: Config merging logic that determines which source file each field came from
- Maintains compatibility with 001-003: Config loader with c12 integration

## Dependencies
- **Depends on**: 003-001 (Add Zod validation with custom error messages)
- **Blocks**: 003-003 (Write tests for config loading, merging, and validation)
