# Spec: 002-002 - Implement merge logic with correct priority order

## JTBD Reference
JTBD-002: Config Merging with Priority

## Purpose
Implement the field-by-field merge logic that combines configurations from multiple sources (CLI flags, explicit --config file, project config, global config, and hardcoded defaults) in the correct priority order. This ensures that partial configs from any source can be merged cleanly without wholesale replacement.

## Scope
### In Scope
- Implement merge function that combines config objects field-by-field
- Apply correct priority order: CLI flags > --config > project > global > defaults
- Ensure partial configs merge correctly (not replaced wholesale)
- Handle undefined values from CLI flags properly (should not override lower-priority sources)
- Maintain compatibility with Zod schema from 001-002

### Out of Scope
- Validation of merged config values (handled by 003-001)
- Source tracking/reporting (handled by 003-002)
- Test suite (handled by 003-003)
- Integration with actual CLI command handlers (handled by 001-004)

## Acceptance Criteria
- [ ] Merge function accepts config objects from all sources (cli overrides, explicit config file, project config, global config, defaults)
- [ ] Correct priority order is applied: CLI flags > --config > project > global > defaults
- [ ] Field-by-field merging works (e.g., setting only smartModel in project config doesn't wipe out fastModel from global config)
- [ ] Undefined/missing values in higher-priority sources don't override values in lower-priority sources
- [ ] Function returns a complete merged config object with all fields (some may be undefined)
- [ ] Works with c12's loadConfig output format
- [ ] Function is exported from config loader module for use in command handlers

## Implementation Notes

### Priority Order
The merge must follow this strict priority (highest to lowest):
1. CLI flags (passed as function parameter, filtered to remove undefined values)
2. `--config` explicit file (loaded via c12 with configFile option)
3. `./.ralphctl.json` project config (auto-discovered by c12)
4. `~/.config/ralphctl/config.json` global config (auto-discovered by c12)
5. Hardcoded defaults (fallback values when nothing else is set)

### Implementation Strategy
- Create a merge function that takes config objects from all sources
- Use a reduce or iterative approach to layer configs from lowest to highest priority
- Only override a field if the higher-priority source has a defined (non-undefined) value
- Handle the c12 loadConfig output which may return both auto-discovered configs
- Consider using a utility function like `Object.assign()` or lodash `merge()` for deep merging if needed

### Key Considerations
- Partial configs are valid from any source (a config may only have smartModel set)
- Undefined values should be treated as "not set" and should not override lower-priority sources
- The CLI filtering from 002-001 ensures only explicitly provided flags are in the CLI overrides
- The merge result should be ready for Zod validation in 003-001

## Dependencies
- Depends on: 002-001 (CLI flag filtering to remove undefined values)
- Blocks: 003-001 (Config validation with custom error messages)
