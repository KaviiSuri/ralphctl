# Implementation Plan: Config File System

## IMPLEMENTATION COMPLETE

All tasks have been successfully completed and tested. The config file system is now fully functional with all 298 tests passing and git tag 0.0.32 created.

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
- ✅ **Git Tag**: Version 0.0.32 created and released

### Bug Fix - Git Tracking Issue (0.0.32)

**Problem**: `.ralphctl/ralph-sessions.json` (runtime session data) was being tracked in git despite `.ralphctl/` being in `.gitignore`.

**Resolution**: Removed the file from git tracking using `git rm --cached .ralphctl/ralph-sessions.json`. The file remains in the working directory but is no longer tracked by git.

**Verification**: All 298 tests continue to pass after the fix.

### Key Implementation Details

**Configuration Priority** (highest to lowest):
1. CLI flags (direct command-line arguments)
2. `--config` file (explicit config file path)
3. `./.ralphctl.{json,yaml,yml}` (project config in cwd)
4. `~/.config/ralphctl/config.{json,yaml}` (global config)
5. Hardcoded defaults in application

**Important Discovery**: c12 does NOT natively support `~/.config/{name}/config.json` pattern. We implemented manual global and project config loading to avoid package resolution errors.

---

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

## Summary

**IMPLEMENTATION COMPLETE** - This plan has been fully executed and all tasks are complete.

The config file system for ralphctl has been successfully implemented with all 9 tasks completed. The implementation has been tested with 26 comprehensive tests (all passing within the 298/298 total test suite), and released as git tag 0.0.32.

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

6. **Version Released**: Git tag 0.0.32 created - ready for production deployment.

**Status**: READY FOR PRODUCTION
