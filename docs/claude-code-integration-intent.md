# Claude Code Integration - Product Intent

## Product Intent

Extend rctl to support Claude Code as an alternative AI agent backend alongside OpenCode, enabling developers to leverage Claude Code's print mode (`-p`) for headless Ralph loops while maintaining the same operational guarantees: isolation, repeatability, inspectability, and the dumb loop philosophy.

## Background

### Current State

rctl currently integrates exclusively with OpenCode as the AI coding agent. The architecture uses:
- OpenCodeAdapter at `/Users/kaviisuri/code/KaviiSuri/ralphctl/src/lib/opencode/adapter.ts`
- CLI-first integration (no SDK dependencies)
- Hardcoded OpenCode CLI commands throughout the command handlers
- Single provider model (OpenCode only)

### Problem

**Vendor Lock-in**: Users cannot leverage Claude Code's capabilities (Anthropic's official CLI) even though it offers:
- Native Claude model support (Opus 4.5, Sonnet 4.5, etc.)
- Print mode (`-p`) for headless execution (skips trust dialogs)
- Official Anthropic tooling with first-class updates
- Potentially better integration with Claude ecosystem

**Opportunity**: rctl's adapter pattern was explicitly designed for swappability (per IMPLEMENTATION_PLAN.md), but this hasn't been realized yet.

## Goals

1. **Multi-Provider Support**: Enable users to choose between OpenCode and Claude Code as their agent backend
2. **Feature Parity**: Maintain all existing rctl capabilities (plan/build modes, loops, inspection, etc.)
3. **Configuration Flexibility**: Allow per-project or global agent selection
4. **Dogfooding**: Use rctl itself to implement this feature via PRD → JTBD → specs workflow
5. **Preserve Philosophy**: Keep the dumb loop, session isolation, and CLI-first principles intact

## Non-Goals

1. **Not** building a unified agent abstraction that works for all possible agents
2. **Not** supporting simultaneous multi-agent execution (e.g., OpenCode + Claude Code in same run)
3. **Not** implementing custom agent orchestration beyond what the underlying CLIs provide
4. **Not** creating GUI or web interface for agent selection
5. **Not** modifying OpenCode or Claude Code CLIs themselves

## Success Criteria

- Users can run `rctl run plan --agent claude-code` and `rctl run build --agent opencode` seamlessly
- Session inspection works identically for both agent types
- Template prompts can specify agent-specific instructions
- Zero regression in existing OpenCode functionality
- Documentation clearly explains trade-offs between agents

## Constraints

- Must maintain backward compatibility (OpenCode remains default)
- Must preserve existing session format and inspection workflow
- Must not require users to have both agents installed
- Must handle agent unavailability gracefully with clear error messages
- Must work within existing CLI command structure (no new top-level commands)

## Out of Scope (Future Consideration)

- Support for other agents beyond OpenCode and Claude Code
- Automatic agent selection based on task characteristics
- Agent capability negotiation or feature detection
- Cross-agent session migration or handoff
- Performance benchmarking or agent comparison tools
