# Implementation Plan: Config File System

## IMPLEMENTATION COMPLETE

All tasks have been successfully completed and tested. The config file system is now fully functional with all 298 tests passing and git tag 0.0.31 created.

### Summary of Accomplishments

**Status**: ALL 9 TASKS COMPLETE

- ✅ **c12 Integration**: c12@3.3.3 dependency installed and integrated
- ✅ **Schema Definition**: Zod schema with custom validation messages at `src/lib/config/schema.ts`
- ✅ **Config Loader**: Manual config loading implemented at `src/lib/config/loader.ts`
- ✅ **CLI Integration**: `--config` flags added to run and step commands
- ✅ **Merge Logic**: Field-by-field merging with correct priority order
- ✅ **Validation**: Custom error messages and source tracking implemented
- ✅ **Comprehensive Tests**: 26 tests written, all passing (298/298 total tests)
- ✅ **TypeScript Compilation**: No compilation errors
- ✅ **Git Tag**: Version 0.0.31 created and released

### Key Implementation Details

**Configuration Priority** (highest to lowest):
1. CLI flags (direct command-line arguments)
2. `--config` file (explicit config file path)
3. `./.ralphctl.{json,yaml,yml}` (project config in cwd)
4. `~/.config/ralphctl/config.{json,yaml}` (global config)
5. Hardcoded defaults in application

**Important Discovery**: c12 does NOT natively support `~/.config/{name}/config.json` pattern. We implemented manual global and project config loading to avoid package resolution errors.

---

## Prerequisites

### Current State
- [x] c12@3.3.3 is installed
- [x] Config loading infrastructure fully implemented
- [x] Zod schemas for config created with custom validation
- [x] TypeScript interfaces exist in `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/domain/types.ts`
- [x] CLI uses Clerc v1.2.1 with specific flag patterns
- [x] Test infrastructure with 26 config tests passing
- [x] Manual config loading for global and project configs implemented

---

## Known Edge Cases and Considerations

### Agent-Specific Model Defaults
- **Issue**: Default models vary by agent type (opencode vs claude-code)
- **Location**: `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/domain/types.ts` (lines 66-67)
- **Current behavior**:
  - OpenCode: smartModel=`openai/gpt-5.2-codex`, fastModel=`zai-coding-plan/glm-4.7`
  - ClaudeCode: smartModel=`claude-opus-4-5`, fastModel=`claude-sonnet-4-5`
- **Config behavior**: Config file models apply to ALL agents. If user sets `smartModel` in config, it applies to both opencode and claude-code.
- **Recommendation**: Document this behavior. Users can use project-specific configs if they want different models per agent.

### Permission Posture Handling
- **Issue**: Permission posture affects file operations
- **Location**: Used in `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/commands/run.ts` (line 21) and passed to agent adapter
- **Config behavior**: Global config can set default permission posture, but this is a security-sensitive setting
- **Recommendation**: Consider if `allow-all` in global config is safe. May want to only allow in project-specific configs.

### Environment Variables
- **Issue**: Existing `RALPHCTL_AGENT` env var not integrated with config system
- **Location**: Not visible in current code, but mentioned in research
- **Current priority**: `CLI Flags > RALPHCTL_AGENT env var > Hardcoded defaults`
- **New priority**: `CLI Flags > Config files > RALPHCTL_AGENT env var > Hardcoded defaults`
- **Implementation**: Not handled in current tasks. If env var still exists, it should be checked AFTER config loading but BEFORE hardcoded defaults.

### Config File Format Detection
- **Issue**: c12 auto-detects JSON vs YAML by file extension
- **Supported**: `.ralphctl.json`, `.ralphctl.yaml`, `.ralphctl.yml`
- **Global**: `~/.config/ralphctl/config.json`, `~/.config/ralphctl/config.yaml`
- **Recommendation**: Document supported formats in README

### Config File Validation on Save
- **Issue**: Users may manually edit config files and introduce errors
- **Mitigation**: Validation happens on load (every command invocation)
- **User experience**: Clear error messages (from 003-001) guide users to fix issues
- **Recommendation**: Consider creating a validation command in future: `rctl config validate`

### Headless Mode / Print Mode
- **Issue**: `noPrint` flag is boolean, not configurable in current config schema
- **Location**: Used in run/step handlers but not in config options
- **Recommendation**: If users want to configure this, add to schema in future iteration

### Project Scoping
- **Issue**: Config files are loaded relative to cwd, not project directory
- **Location**: When using `--project <name>`, prompt resolution changes but config loading doesn't
- **Current behavior**: Config loaded from cwd, not `projects/<name>/`
- **Recommendation**: Consider loading project config from `projects/<name>/.ralphctl.json` in future

---

## File Structure After Implementation

```
ralphctl/
├── src/
│   ├── cli.ts (modified)
│   ├── domain/
│   │   └── types.ts (no changes needed)
│   └── lib/
│       ├── config/ (NEW)
│       │   ├── schema.ts (NEW)
│       │   ├── loader.ts (NEW)
│       │   └── __tests__/
│       │       └── config.test.ts (NEW)
│       └── commands/
│           ├── run.ts (modified)
│           └── step.ts (modified)
├── package.json (modified - c12 added)
└── .ralphctl.json (optional, user-created)

~/.config/ralphctl/
└── config.json (optional, user-created)
```

---

## Rollout and Documentation

### Post-Implementation Tasks (Not in scope, but recommended)

1. **Update README.md**:
   - [ ] Document config file locations and priority
   - [ ] Show example config files
   - [ ] Explain `--config` flag usage
   - [ ] Document supported file formats (JSON, YAML)

2. **Migration Guide**:
   - [ ] No breaking changes, but users can now simplify their workflows
   - [ ] Show examples of common configs (model preferences, agent selection)

3. **Error Message Improvements**:
   - [ ] Ensure all error messages point users to documentation
   - [ ] Consider adding a "Config Help" command

4. **Performance Considerations**:
   - [ ] Config loading is async but should be fast (<100ms)
   - [ ] c12 caches loaded configs (per-process)
   - [ ] No impact on CLI startup time

---

## Success Metrics

**Implementation Complete When**:
- [x] All 9 tasks marked complete (checked off) ✅
- [x] All tests pass (`bun test`) - 298/298 tests passing ✅
- [x] All 6 manual test scenarios work as expected ✅
- [x] TypeScript compiles without errors (`bun run typecheck`) ✅
- [x] No regressions in existing CLI behavior ✅

**User-Facing Success**:
- [x] Users can create `~/.config/ralphctl/config.{json,yaml}` with their preferences ✅
- [x] Users can create `.ralphctl.{json,yaml,yml}` in projects for project-specific settings ✅
- [x] CLI flags still override config files (backward compatible) ✅
- [x] Clear error messages when config files have invalid values ✅
- [x] No change to existing CLI behavior when config files don't exist ✅

---

## Summary

**IMPLEMENTATION COMPLETE** - This plan has been fully executed and all tasks are complete.

The config file system for ralphctl has been successfully implemented with all 9 tasks completed. The implementation has been tested with 26 comprehensive tests (all passing within the 298/298 total test suite), and released as git tag 0.0.31.

### Implementation Highlights

1. **Manual Config Loading**: c12 does NOT support `~/.config/{name}/config.json` natively, so we implemented manual global and project config loading to avoid package resolution errors.

2. **Test Coverage**: All tests passing - 298/298 total tests (26 new config tests + 272 existing tests).

3. **TypeScript Compilation**: Zero errors, fully type-safe implementation.

4. **Files Created**:
   - `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/config/schema.ts`
   - `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/config/loader.ts`
   - `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/config/__tests__/config.test.ts`

5. **Files Modified**:
   - `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/cli.ts` (added --config flags)
   - `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/commands/run.ts` (integrated config loading)
   - `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/commands/step.ts` (integrated config loading)
   - `/Users/kaviisuri/code/KaviiSuri/ralphctl/package.json` (c12@3.3.3 dependency)

6. **Version Released**: Git tag 0.0.31 created - ready for production deployment.

**Status**: READY FOR PRODUCTION
