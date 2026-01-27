# PRD: config-files

## Overview

Add config file support to ralphctl so users can set persistent defaults for CLI options instead of typing flags repeatedly on every command invocation.

## Goals

1. Load configuration from JSON/YAML files at global (`~/.config/ralphctl/`) and project (`./.ralphctl.json`) locations
2. Support `--config <path>` flag to specify a custom config file
3. Merge configs with priority: CLI flags > `--config` file > project config > global config > hardcoded defaults
4. Validate merged configuration using Zod
5. Support partial configs from any source

## Non-Goals

1. Config file generation/scaffolding commands (e.g., `rctl config init`)
2. Interactive config editing (e.g., `rctl config set smartModel "x"`)
3. Config file format beyond JSON/YAML (no TOML, no TypeScript config)
4. Environment variable support for individual config fields (keeping existing `RALPHCTL_AGENT` but not adding more)

## User Stories

### US-1: Set persistent model defaults

**As a** ralphctl user,
**I want to** set my preferred models in a config file,
**So that** I don't have to type `--smart-model` and `--fast-model` on every command.

**Acceptance Criteria**:
- Config loads from `~/.config/ralphctl/config.json` (global)
- Config loads from `./.ralphctl.json` (project)
- `--config <path>` flag loads config from specified path
- Custom config (via `--config`) overrides project and global configs
- Project config overrides global config
- CLI flags override all config sources
- Partial configs work (can set just `smartModel` without other fields)
- Invalid config values produce clear error messages
- Missing config files are silently ignored (not an error)
- Missing `--config` file produces an error (explicit path should exist)
