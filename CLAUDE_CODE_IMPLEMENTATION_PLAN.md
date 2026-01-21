# Claude Code Integration - Implementation Plan

## Overview

This document provides a comprehensive plan for adding Claude Code support to rctl, enabling the tool to work with both OpenCode and Claude Code as alternative AI agent backends. This feature follows rctl's own dogfooding philosophy, using the PRD → JTBD → Specs workflow.

**Status**: Planning Complete, Ready for Implementation
**Priority**: P0 (High Value Feature)
**Effort Estimate**: Medium (5-7 major tasks)

---

## 📋 Quick Links

- [Product Intent](./docs/claude-code-integration-intent.md) - High-level vision and goals
- [Jobs To Be Done](./docs/claude-code-integration-jtbd.md) - User-focused requirements (7 JTBDs)
- [Specifications](./specs/jtbd-10*) - Technical implementation specs (4+ specs)

---

## 🎯 What This Enables

### Current State
- rctl only works with OpenCode
- Users cannot leverage Claude Code's capabilities
- Adapter pattern exists but isn't utilized

### Future State
- Users can choose between OpenCode and Claude Code via `--agent` flag
- Claude Code project mode (`-p`) enabled by default for context-aware development
- Mixed-agent sessions supported with proper inspection
- Foundation for supporting future agents

### User Experience

```bash
# Use OpenCode (default)
$ rctl run build
Using OpenCode
--- Iteration 1/10 ---

# Use Claude Code with project mode
$ rctl run build --agent claude-code
Using Claude Code
Project mode: enabled
--- Iteration 1/10 ---

# Disable project mode for speed
$ rctl run build --agent claude-code --no-project-mode
Using Claude Code
Project mode: disabled
--- Iteration 1/10 ---

# Inspect mixed-agent sessions
$ rctl inspect
Inspection complete: 15 sessions exported to inspect.json
(includes sessions from both OpenCode and Claude Code)
```

---

## 🏗️ Architecture Overview

### Current Architecture
```
CLI (cli.ts)
  ↓
Command Handlers (run.ts, step.ts)
  ↓
OpenCodeAdapter (hardcoded)
  ↓
OpenCode CLI
```

### New Architecture
```
CLI (cli.ts)
  ↓
Command Handlers (run.ts, step.ts)
  ↓
Agent Factory (factory.ts) ← Agent Selection Logic
  ↓                ↓
OpenCodeAdapter   ClaudeCodeAdapter
  ↓                ↓
OpenCode CLI    Claude Code CLI
```

### Key Changes
1. **AgentAdapter Interface**: Abstract contract for all agents
2. **Agent Factory**: Creates correct adapter based on user selection
3. **Refactored OpenCodeAdapter**: Implements AgentAdapter interface
4. **New ClaudeCodeAdapter**: Claude Code implementation
5. **Extended Session State**: Tracks which agent created each session
6. **Agent-Aware Inspection**: Routes exports to correct agent

---

## 📝 Jobs To Be Done Summary

| ID | Job | Priority | Complexity |
|----|-----|----------|------------|
| JTBD-101 | Choose My Preferred Agent Backend | P0 | Medium |
| JTBD-102 | Adapt Agent-Specific Execution Patterns | P0 | High |
| JTBD-103 | Configure Claude Code Project Mode | P1 | Low |
| JTBD-104 | Preserve Inspection and Session Management | P1 | Medium |
| JTBD-105 | Maintain Model Configuration Flexibility | P1 | Medium |
| JTBD-106 | Bootstrap with Agent-Aware Templates | P2 | Low |
| JTBD-107 | Understand Trade-offs and Make Informed Choices | P2 | Low |

---

## 🔨 Implementation Tasks

### Phase 1: Foundation (P0)
**Goal**: Create abstractions and core infrastructure

- [ ] **Task 1.1**: Create AgentAdapter interface
  - File: `src/domain/agent.ts`
  - Spec: [JTBD-102-SPEC-001](./specs/jtbd-102-spec-001.md)
  - Effort: 2 hours
  - Details: Define TypeScript interface with all required methods and types

- [ ] **Task 1.2**: Refactor OpenCodeAdapter to implement AgentAdapter
  - Files:
    - Move `src/lib/opencode/adapter.ts` → `src/lib/agents/opencode-adapter.ts`
    - Update imports across codebase
  - Spec: JTBD-102-SPEC-001
  - Effort: 3 hours
  - Details: Implement interface methods, ensure backward compatibility

- [ ] **Task 1.3**: Implement ClaudeCodeAdapter
  - File: `src/lib/agents/claude-code-adapter.ts`
  - Spec: [JTBD-102-SPEC-002](./specs/jtbd-102-spec-002.md)
  - Effort: 5 hours
  - Details:
    - Research Claude Code CLI commands and flags
    - Implement all AgentAdapter methods
    - Handle session ID extraction and completion detection
  - **⚠️ Research Required**: Verify Claude Code CLI syntax before implementation

- [ ] **Task 1.4**: Create Agent Factory
  - File: `src/lib/agents/factory.ts`
  - Spec: [JTBD-101-SPEC-001](./specs/jtbd-101-spec-001.md)
  - Effort: 3 hours
  - Details:
    - Agent selection logic (CLI flag > env var > default)
    - Availability validation with clear error messages
    - Installation URL helper

### Phase 2: CLI Integration (P0)
**Goal**: Enable users to select and use agents

- [ ] **Task 2.1**: Add `--agent` flag to commands
  - File: `src/cli.ts`
  - Spec: [JTBD-101-SPEC-001](./specs/jtbd-101-spec-001.md)
  - Effort: 1 hour
  - Details: Add enum flag to `run` and `step` commands

- [ ] **Task 2.2**: Update command handlers to use factory
  - Files: `src/lib/commands/run.ts`, `src/lib/commands/step.ts`
  - Spec: [JTBD-101-SPEC-001](./specs/jtbd-101-spec-001.md)
  - Effort: 3 hours
  - Details:
    - Replace direct OpenCodeAdapter instantiation with factory
    - Handle agent unavailability errors
    - Add console logging for selected agent

### Phase 3: Claude Code Project Mode (P1)
**Goal**: Enable context-aware development with Claude Code

- [ ] **Task 3.1**: Add `--no-project-mode` flag
  - File: `src/cli.ts`
  - Spec: [JTBD-103-SPEC-001](./specs/jtbd-103-spec-001.md)
  - Effort: 1 hour

- [ ] **Task 3.2**: Integrate project mode with factory
  - Files: `src/lib/agents/factory.ts`, command handlers
  - Spec: [JTBD-103-SPEC-001](./specs/jtbd-103-spec-001.md)
  - Effort: 2 hours
  - Details: Pass useProjectMode to ClaudeCodeAdapter constructor

- [ ] **Task 3.3**: Update prompt templates
  - Files: `src/lib/templates/index.ts`
  - Spec: [JTBD-103-SPEC-001](./specs/jtbd-103-spec-001.md)
  - Effort: 1 hour
  - Details: Add notes about project mode behavior

### Phase 4: Session Management (P1)
**Goal**: Track agent type per session and enable mixed-agent inspection

- [ ] **Task 4.1**: Extend session state schema
  - File: `src/domain/types.ts`
  - Spec: [JTBD-104-SPEC-001](./specs/jtbd-104-spec-001.md)
  - Effort: 1 hour
  - Details: Add `agent` and `projectMode` fields to RalphSession

- [ ] **Task 4.2**: Update session write logic
  - File: `src/lib/state/index.ts`
  - Spec: [JTBD-104-SPEC-001](./specs/jtbd-104-spec-001.md)
  - Effort: 2 hours
  - Details:
    - Add version field to SessionsFile
    - Populate agent and projectMode in addSession

- [ ] **Task 4.3**: Implement backward compatibility
  - File: `src/lib/state/index.ts`
  - Spec: [JTBD-104-SPEC-001](./specs/jtbd-104-spec-001.md)
  - Effort: 2 hours
  - Details: Handle sessions without agent field (default to OpenCode)

- [ ] **Task 4.4**: Update inspect command
  - File: `src/lib/commands/inspect.ts`
  - Spec: [JTBD-104-SPEC-001](./specs/jtbd-104-spec-001.md)
  - Effort: 4 hours
  - Details:
    - Create adapters for each agent type present in sessions
    - Route exports to correct agent
    - Handle missing agents gracefully
    - Update InspectEntry schema

### Phase 5: Testing (P0)
**Goal**: Ensure reliability and backward compatibility

- [ ] **Task 5.1**: Unit tests for AgentAdapter interface
  - Effort: 2 hours
  - Coverage:
    - OpenCodeAdapter implements interface correctly
    - ClaudeCodeAdapter implements interface correctly
    - Session ID extraction patterns
    - Completion detection

- [ ] **Task 5.2**: Unit tests for Agent Factory
  - Effort: 2 hours
  - Coverage:
    - Agent selection resolution (CLI > env > default)
    - Availability validation and error messages
    - Factory creation with different agent types

- [ ] **Task 5.3**: Unit tests for session management
  - Effort: 2 hours
  - Coverage:
    - Session read/write with agent field
    - Backward compatibility (old sessions)
    - Version field handling

- [ ] **Task 5.4**: Integration tests (gated)
  - Effort: 4 hours
  - Coverage:
    - End-to-end run with OpenCode
    - End-to-end run with Claude Code (if installed)
    - Inspect mixed-agent sessions
    - Agent unavailability handling

### Phase 6: Documentation (P1)
**Goal**: Enable users to understand and use new features

- [ ] **Task 6.1**: Update README
  - Effort: 2 hours
  - Content:
    - Add `--agent` flag documentation
    - Add `--no-project-mode` flag documentation
    - Include usage examples
    - Add installation links for both agents

- [ ] **Task 6.2**: Create agent comparison guide
  - File: `docs/agent-comparison.md`
  - Effort: 2 hours
  - Content:
    - Feature comparison table
    - When to use each agent
    - Performance characteristics
    - Model availability

- [ ] **Task 6.3**: Update existing documentation
  - Files: Various docs
  - Effort: 1 hour
  - Details: Update references to OpenCode to be agent-agnostic

---

## 🔬 Pre-Implementation Research

**Critical research items** (complete before Task 1.3):

1. **Claude Code CLI Verification**:
   - [ ] Confirm CLI command name: `claude` or `claude-code`?
   - [ ] Verify project mode flag: `-p` or `--project`?
   - [ ] Check for headless mode flag
   - [ ] Determine session ID output format
   - [ ] Verify export command syntax: `claude export <sessionId>`?
   - [ ] Test model name format: `claude-sonnet-4-5` vs `sonnet-4-5`?

2. **Installation URLs**:
   - [ ] Confirm Claude Code installation URL
   - [ ] Check if CLI is included with Claude Desktop or separate

3. **Compatibility**:
   - [ ] Test if `<promise>COMPLETE</promise>` marker works with Claude Code
   - [ ] Verify Claude Code supports prompt templates via CLI

**Research Method**: Install Claude Code locally and experiment with CLI commands.

---

## 🚨 Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude Code CLI differs significantly from OpenCode | High | Research thoroughly before implementation; adapter pattern isolates differences |
| Claude Code may not support headless mode | High | Use interactive mode as fallback; document limitation |
| Session ID extraction fails | Medium | Support multiple regex patterns; log warnings for debugging |
| Backward compatibility breaks existing sessions | High | Thorough testing; lazy migration strategy |
| Users don't have Claude Code installed | Low | Clear error messages with installation links |

---

## 📊 Success Metrics

**Technical Metrics**:
- [ ] Zero regressions in OpenCode functionality (all existing tests pass)
- [ ] Both agents pass integration tests
- [ ] Backward compatibility: old sessions load correctly
- [ ] Mixed-agent sessions inspect successfully

**User Metrics**:
- [ ] Users can switch between agents without errors
- [ ] Clear error messages when agent unavailable
- [ ] Documentation covers common use cases

**Quality Metrics**:
- [ ] Test coverage remains above 80%
- [ ] No new linting errors
- [ ] All specs have corresponding implementation
- [ ] Code review approved with no blockers

---

## 🔄 Implementation Order

**Recommended sequence** (optimized for dependencies and testing):

1. **Foundation First** (Tasks 1.1 → 1.4): Build abstractions before implementations
2. **CLI Integration** (Tasks 2.1 → 2.2): Enable user interaction early
3. **Claude Code Features** (Task 3.x): Add differentiating features
4. **Session Management** (Task 4.x): Ensure inspection works
5. **Testing** (Task 5.x): Validate everything works
6. **Documentation** (Task 6.x): Enable user adoption

**Parallel Work Opportunities**:
- Task 1.2 (OpenCode refactor) and Task 1.3 (Claude Code adapter) can proceed in parallel after Task 1.1
- Task 3.x (project mode) can proceed independently of Task 4.x (session management)
- Task 6.x (documentation) can start once Task 2.2 is complete

---

## 🧪 Testing Strategy

### Unit Tests
- **Location**: `tests/unit/`
- **Mocking**: Use mocked process execution (Bun.spawn)
- **Focus**: Business logic, not CLI integration

### Integration Tests
- **Location**: `tests/integration/`
- **Gating**: Require `OPENCODE_INSTALLED=true` and `CLAUDE_CODE_INSTALLED=true` env vars
- **Focus**: End-to-end workflows with real CLIs

### Manual Testing Checklist
- [ ] Install OpenCode only → run and step work, Claude Code shows error
- [ ] Install Claude Code only → run and step work with --agent claude-code
- [ ] Install both → switch between agents seamlessly
- [ ] Old project with existing sessions → inspect works
- [ ] Create mixed-agent sessions → inspect shows both
- [ ] Use --no-project-mode → Claude Code runs without -p flag

---

## 📚 Related Documents

### Product & Planning
- [Product Intent](./docs/claude-code-integration-intent.md) - Vision and goals
- [Jobs To Be Done](./docs/claude-code-integration-jtbd.md) - User requirements

### Technical Specifications
- [JTBD-102-SPEC-001: Agent Adapter Interface](./specs/jtbd-102-spec-001.md)
- [JTBD-102-SPEC-002: ClaudeCodeAdapter Implementation](./specs/jtbd-102-spec-002.md)
- [JTBD-101-SPEC-001: CLI Agent Selection](./specs/jtbd-101-spec-001.md)
- [JTBD-103-SPEC-001: Claude Code Project Mode](./specs/jtbd-103-spec-001.md)
- [JTBD-104-SPEC-001: Agent-Aware Session Management](./specs/jtbd-104-spec-001.md)

### Additional Specs To Create
- JTBD-105-SPEC-001: Agent-Aware Model Configuration
- JTBD-106-SPEC-001: Agent-Aware Template Generation
- JTBD-107-SPEC-001: Agent Comparison Documentation

---

## 🎓 Using This Plan with rctl

This plan is designed to be consumed by rctl itself (dogfooding). To implement using rctl:

### Using Plan Mode
```bash
# Analyze specs and create detailed implementation plan
$ rctl run plan --max-iterations 5

# The agent will:
# 1. Read all specs in specs/jtbd-10*
# 2. Understand dependencies and order
# 3. Create detailed implementation plan
# 4. Identify potential issues
```

### Using Build Mode
```bash
# Implement the feature following specs
$ rctl run build --max-iterations 20

# The agent will:
# 1. Read specs/jtbd-102-spec-001.md (AgentAdapter interface)
# 2. Implement interface in src/domain/agent.ts
# 3. Run tests
# 4. Move to next spec iteratively
```

### Mixed Approach (Recommended)
```bash
# Plan first
$ rctl run plan --max-iterations 3

# Review plan, then build
$ rctl run build --max-iterations 15

# If issues arise, switch back to plan mode to reassess
$ rctl step plan
```

---

## 🏁 Definition of Done

This feature is complete when:

- [ ] All tasks in Phases 1-6 are checked off
- [ ] All acceptance criteria in specs are met
- [ ] All tests pass (unit and integration)
- [ ] No regressions in existing functionality
- [ ] Documentation is updated and reviewed
- [ ] Code review approved
- [ ] Feature works with both OpenCode and Claude Code installed
- [ ] Feature degrades gracefully when only one agent is installed
- [ ] Old sessions load and inspect correctly (backward compatibility)

---

## 📞 Questions or Clarifications

For questions about this plan:
1. Review the relevant spec document first
2. Check the JTBD for user-level context
3. Refer to Product Intent for vision alignment
4. If still unclear, create a plan mode session to explore

---

**Last Updated**: 2026-01-21
**Plan Version**: 1.0.0
**Status**: Ready for Implementation 🚀
