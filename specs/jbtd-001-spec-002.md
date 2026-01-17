# Spec: OpenCode Alignment (JTBD-001)

## Purpose

Ensure the CLI behavior is aligned with OpenCode’s native CLI workflows and does not rely on SDK-only pathways.

## Scope

- Use `opencode` CLI commands for all core workflows.
- Avoid SDK-based session control or transport layers.

## Out of scope

- OpenCode server or SDK integrations.
- Custom transport or protocol logic.

## Behavioral requirements

- All operations that invoke OpenCode do so using `opencode` CLI commands.
- The product does not require OpenCode SDK installation or usage.
- Output and behavior should mirror OpenCode CLI semantics where applicable.

## Acceptance criteria

- A fresh installation with only OpenCode CLI installed is sufficient to use `ralphctl`.
- No SDK-specific configuration is required for any command.
