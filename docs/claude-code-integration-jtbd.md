# Claude Code Integration - Jobs To Be Done

## Overview

This document defines the Jobs To Be Done (JTBD) for extending rctl to support Claude Code as an alternative AI agent backend alongside OpenCode.

---

## JTBD-101: Choose My Preferred Agent Backend

**As a developer**, I need to select which AI agent (OpenCode or Claude Code) executes my Ralph loops, so that I can leverage the specific capabilities, models, and ecosystem features of my preferred tooling.

### Topics (Priority Order)

1. **Agent selection mechanism** - How do users specify their agent choice?
2. **Configuration persistence** - Should choice be per-command, per-project, or global?
3. **Default behavior** - What happens when no agent is specified?
4. **Availability validation** - How to check if selected agent is installed?
5. **Error messaging** - What happens when selected agent is unavailable?

### Non-Goals

- Auto-detection of "best" agent based on task analysis
- Support for agents beyond OpenCode and Claude Code
- Migration or conversion between agent formats

### Deliverables

1. **CLI flag**: `--agent <opencode|claude-code>` for runtime selection
2. **Environment variable**: `RALPHCTL_AGENT` for session/project-level defaults
3. **Fallback logic**: OpenCode remains default if unspecified
4. **Validation**: Pre-flight checks for agent availability with actionable errors

---

## JTBD-102: Adapt Agent-Specific Execution Patterns

**As a developer**, I need rctl to correctly invoke whichever agent I've chosen with the appropriate CLI syntax and flags, so that my Ralph loops execute successfully regardless of backend.

### Topics (Priority Order)

1. **Adapter abstraction** - Common interface for both agents
2. **CLI command mapping** - How do OpenCode and Claude Code commands differ?
3. **Flag translation** - Converting rctl flags to agent-specific flags
4. **Session ID extraction** - Different output formats between agents
5. **Completion detection** - Does `<promise>COMPLETE</promise>` work universally?

### Non-Goals

- Creating a unified agent protocol specification
- Modifying agent CLIs to conform to a standard
- Supporting agents that don't have CLI interfaces

### Deliverables

1. **AgentAdapter interface** - Abstract contract for agent operations
2. **ClaudeCodeAdapter class** - Implementation for Claude Code
3. **Refactored OpenCodeAdapter** - Implements shared interface
4. **Factory pattern** - Creates correct adapter based on selection

---

## JTBD-103: Configure Claude Code Print Mode

**As a developer**, I need to leverage Claude Code's print mode (`-p` / `--print` flag) when running headless loops, so that responses are printed directly without interactive prompts and trust dialogs are skipped for faster automation.

### Topics (Priority Order)

1. **Print mode semantics** - What does `-p` do in Claude Code? (prints response, exits, skips trust dialog)
2. **Mode mapping** - Should plan/build modes use different Claude Code flags?
3. **Trust implications** - What are the security implications of skipping trust dialogs?
4. **Performance implications** - Does print mode improve execution speed?
5. **Template compatibility** - Do existing prompts work with print mode?

### Non-Goals

- Supporting all Claude Code flags and configuration options
- Implementing print mode for OpenCode (doesn't exist)
- Custom trust dialog configuration

### Deliverables

1. **Default behavior**: Both plan and build modes with Claude Code use `-p` flag automatically for headless execution
2. **Override option**: `--no-print` flag to disable if needed (shows trust dialogs, interactive prompts)
3. **Documentation**: Clear explanation of print mode and security implications
4. **Security warnings**: Document that print mode skips trust dialogs, only use in trusted directories

---

## JTBD-104: Preserve Inspection and Session Management

**As a developer**, I need the `inspect` command to work seamlessly with sessions from both OpenCode and Claude Code, so that I can audit and debug my Ralph loops regardless of which agent created them.

### Topics (Priority Order)

1. **Export format compatibility** - Do both agents support `export` commands?
2. **Session ID formats** - Different ID structures between agents?
3. **Metadata preservation** - Which agent ran which session?
4. **Mixed sessions** - Handling projects with both agent types
5. **Backward compatibility** - Existing sessions continue to work

### Non-Goals

- Converting between agent-specific export formats
- Creating a unified export schema
- Supporting session replay or continuation across agents

### Deliverables

1. **Agent field in session state** - Track which agent created each session
2. **Export delegation** - Route export requests to correct agent
3. **Graceful degradation** - Handle missing agents during inspection
4. **Inspect output** - Include agent type in inspection JSON

---

## JTBD-105: Maintain Model Configuration Flexibility

**As a developer**, I need to configure smart and fast models appropriately for my chosen agent, so that my prompts use the optimal models for each task regardless of backend.

### Topics (Priority Order)

1. **Model name formats** - OpenCode vs Claude Code model naming differences
2. **Default models** - Different defaults per agent type
3. **Model validation** - Does chosen agent support specified models?
4. **Template placeholders** - Do `{smart}` and `{fast}` work universally?
5. **Override behavior** - How do CLI flags interact with agent choice?

### Non-Goals

- Model capability detection or feature negotiation
- Automatic model selection based on task complexity
- Supporting custom model endpoints or providers

### Deliverables

1. **Agent-specific defaults**: Different smart/fast models per agent
2. **Model resolver refactor**: Agent-aware model placeholder replacement
3. **Validation**: Check model names against agent's supported models
4. **Documentation**: Model naming guide for each agent

---

## JTBD-106: Bootstrap with Agent-Aware Templates

**As a developer**, I need the `init` command to create prompt templates that work optimally with my chosen agent, so that I don't have to manually adjust prompts for agent-specific features or syntax.

### Topics (Priority Order)

1. **Template variants** - Should there be agent-specific template versions?
2. **Agent detection** - Should init detect available agents?
3. **Universal prompts** - Can one prompt work well for both agents?
4. **Migration path** - How do existing templates adapt?
5. **Documentation in templates** - Should templates explain agent differences?

### Non-Goals

- Creating drastically different workflows per agent
- Hiding agent differences from users (transparency is key)
- Supporting template translation or conversion

### Deliverables

1. **Universal templates**: Default prompts work for both agents
2. **Agent-specific instructions**: Comments in templates explain agent differences
3. **Init flag**: Optional `--agent` flag for agent-specific template variants
4. **Migration guide**: Document how to adapt existing templates

---

## JTBD-107: Understand Trade-offs and Make Informed Choices

**As a developer**, I need clear documentation about the differences, trade-offs, and appropriate use cases for OpenCode vs Claude Code, so that I can make informed decisions about which agent to use for my projects.

### Topics (Priority Order)

1. **Feature comparison** - What can each agent do?
2. **Performance characteristics** - Speed, cost, quality differences
3. **Model access** - Which models are available in each?
4. **Installation requirements** - How to set up each agent?
5. **Use case recommendations** - When to choose which agent?

### Non-Goals

- Declaring one agent "better" than the other
- Maintaining agent-specific tutorials or deep dives
- Tracking agent feature parity or version changes

### Deliverables

1. **Comparison table** - Side-by-side feature and capability comparison
2. **Decision guide** - Flowchart or guide for choosing an agent
3. **Installation docs** - Setup instructions for both agents
4. **Migration guide** - Switching between agents mid-project

---

## Implementation Priority

Recommended implementation order based on dependencies:

1. **JTBD-102** (Adapter abstraction) - Foundation for everything else
2. **JTBD-101** (Agent selection) - Required to test adapter implementations
3. **JTBD-103** (Claude Code print mode) - Core feature differentiator
4. **JTBD-105** (Model configuration) - Essential for prompt execution
5. **JTBD-104** (Session management) - Preserve inspectability
6. **JTBD-106** (Templates) - Improve user experience
7. **JTBD-107** (Documentation) - Final polish and guidance

## Related Documents

- [Product Intent](./claude-code-integration-intent.md)
- [Specifications](../specs/jtbd-101-*) - To be created
