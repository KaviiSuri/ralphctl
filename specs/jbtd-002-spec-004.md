# Spec: Model Defaults (JTBD-002)

## Purpose

Provide deterministic default model roles for `{smart}` and `{fast}` so prompt templates behave consistently without configuration.

## Scope

- Default model identifiers for `{smart}` and `{fast}`.
- Override capability while preserving role separation.

## Out of scope

- Provider authentication or credential management.
- Advanced model routing logic.

## Behavioral requirements

- `{smart}` defaults to `openai/gpt-5.2-codex`.
- `{fast}` defaults to `zai-coding-plan/glm-4.7`.
- Users can override defaults but must preserve separate values for `{smart}` and `{fast}` roles.

## Acceptance criteria

- A run without overrides uses the specified default model identifiers.
- A run with overrides uses the new identifiers while still mapping to `{smart}` and `{fast}`.
