# Jobs to Be Done: config-files

## JTBD-001: Config File Discovery and Loading

**Job Statement**: When I run a ralphctl command, I want the tool to automatically find and load my config files, so that my preferences are applied without me specifying them.

**Context**: The config loader needs to check multiple locations in a specific order and handle both auto-discovered files (silent on missing) and explicitly specified files (error on missing).

**Success Criteria**:
- Discovers `~/.config/ralphctl/config.json` (global)
- Discovers `./.ralphctl.json` (project)
- Handles `--config <path>` flag
- Silently ignores missing auto-discovered files
- Errors on missing explicit `--config` file
- Supports JSON and YAML formats

---

## JTBD-002: Config Merging with Priority

**Job Statement**: When I have configs in multiple places, I want them merged with clear priority rules, so that I can set global defaults and override them per-project or per-command.

**Context**: Users may have global preferences but want to override specific fields for certain projects or one-off commands. The merge must be field-by-field, not wholesale replacement.

**Success Criteria**:
- Priority order: CLI flags > `--config` > project > global > defaults
- Partial configs merge correctly (not replaced wholesale)
- Later sources override earlier ones field-by-field

---

## JTBD-003: Config Validation and Error Handling

**Job Statement**: When my config has invalid values, I want clear error messages, so that I can fix the issue quickly.

**Context**: Config files are user-edited and prone to typos or invalid values. Errors should be actionable and point to the source.

**Success Criteria**:
- Validates all fields against Zod schema
- Invalid enum values produce helpful errors (e.g., "agent must be 'opencode' or 'claude-code'")
- Invalid types produce helpful errors (e.g., "maxIterations must be a number")
- Reports which config file caused the error
