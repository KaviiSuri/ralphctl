# Spec: 003-003 - Write tests for config loading, merging, and validation

## JTBD Reference
JTBD-003: Config Validation and Error Handling

## Purpose
Establish comprehensive test coverage for the config system to ensure:
1. Config files are loaded correctly from all supported locations
2. Configs are merged with the correct priority order
3. Validation catches invalid values and produces helpful error messages
4. Error reporting indicates which config file caused the issue

This testing ensures the config system is reliable and maintainable as the codebase evolves.

## Scope

### In Scope
- Unit tests for the config loader module (`loadAppConfig` function)
- Tests for config merging logic with all priority levels (CLI flags > --config file > project config > global config > defaults)
- Tests for Zod validation with custom error messages
- Tests for source tracking and error reporting
- Integration tests demonstrating end-to-end config loading from files
- Edge cases: partial configs, missing files, invalid values, env var handling

### Out of Scope
- CLI command integration tests (those test Clerc, not the config system)
- Performance benchmarks
- Manual testing procedures
- Config scaffolding or generation tests (non-goal per PRD)

## Acceptance Criteria
- [ ] Config loader unit tests pass (≥90% coverage of `loadAppConfig` function)
- [ ] Merging priority tests verify correct order: CLI > --config > project > global > defaults
- [ ] Validation tests confirm Zod schema enforcement for all fields
- [ ] Custom error message tests verify helpful messages for invalid enums (agent, permissionPosture) and types (maxIterations)
- [ ] Source tracking tests verify error messages indicate which config file caused issues
- [ ] Integration tests load from actual temporary JSON/YAML files
- [ ] Edge case tests cover partial configs, missing files, missing --config file (error), and undefined CLI values
- [ ] All tests pass in both Bun runtime and can be run via test runner script
- [ ] Test file is located at `src/__tests__/config.test.ts` or similar location

## Implementation Notes

### Test Categories

#### 1. Config Loader Tests
- Test `loadAppConfig()` with no arguments (loads from defaults only)
- Test loading with CLI overrides only
- Test loading with global config file (~/.config/ralphctl/config.json)
- Test loading with project config file (./.ralphctl.json)
- Test loading with explicit --config flag

#### 2. Merging Priority Tests
- CLI flags override all other sources (test each field individually)
- --config file overrides project and global configs
- Project config (.ralphctl.json) overrides global config (~/.config/ralphctl/config.json)
- Global config overrides hardcoded defaults
- Partial configs merge correctly (e.g., CLI sets smartModel, project sets maxIterations, both are in result)
- Verify field-by-field merging, not wholesale replacement

#### 3. Validation Tests
- Valid config passes: `{ smartModel: "claude-opus", fastModel: "claude-sonnet", agent: "claude-code", maxIterations: 5, permissionPosture: "ask" }`
- Invalid agent enum: reject values other than "opencode" or "claude-code" with helpful message
- Invalid permissionPosture enum: reject values other than "allow-all" or "ask" with helpful message
- Invalid maxIterations type: reject non-number values with helpful message
- Invalid smartModel type: reject non-string values with helpful message
- Invalid fastModel type: reject non-string values with helpful message
- Empty config object passes (all fields are optional)
- Extra fields in config are allowed/ignored (or stripped, per preference)

#### 4. Error Message Tests
- Validation error includes which config file was the problem source (if tracked)
- Invalid enum error is actionable: "agent must be 'opencode' or 'claude-code', got 'invalid'"
- Invalid type error is actionable: "maxIterations must be a number, got string"
- Missing explicit --config file produces error (not silent)
- Missing auto-discovered files are silent (no error)

#### 5. Edge Cases
- Undefined CLI flag values don't override config file values
- Empty config file ({}) is valid
- Config with only one field set works (partial config)
- Multiple config sources each providing different fields merge correctly
- Whitespace/case sensitivity in enums (should fail or be handled explicitly)
- Very large values (maxIterations: 999999) are valid if type is correct
- Null/undefined in config file are handled (filtered vs kept as is)

#### 6. Integration Tests
- Create temporary .ralphctl.json, ~/.config/ralphctl/config.json, and explicit config file
- Verify loadAppConfig reads them in correct priority order
- Clean up temporary files after test

### Test Data
- Use mock/temporary config files (not global user config)
- Fixture directory: `src/__tests__/fixtures/config/` for sample config files
- Sample valid config:
  ```json
  {
    "smartModel": "claude-opus-4-5",
    "fastModel": "claude-sonnet-4-5",
    "agent": "claude-code",
    "maxIterations": 15,
    "permissionPosture": "ask"
  }
  ```

### Test Framework
- Use Bun's built-in test runner (or Vitest if already configured)
- Test file structure:
  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from "bun:test";
  import { loadAppConfig, ConfigSchema } from "../config";

  describe("Config Loading", () => {
    // tests here
  });

  describe("Config Merging", () => {
    // tests here
  });

  describe("Validation", () => {
    // tests here
  });

  describe("Error Messages", () => {
    // tests here
  });
  ```

### Coverage Goals
- Aim for ≥90% line coverage of config module
- All error paths must be tested
- All merge priority scenarios must be tested

### Dependencies
- Tests depend on 003-002 being complete (source tracking)
- Tests depend on 003-001 being complete (Zod validation)
- Tests depend on 002-002 being complete (merge logic)

## Dependencies
- Depends on: 003-002 (source tracking implementation)
- Blocks: None
