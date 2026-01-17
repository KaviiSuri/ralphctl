# Spec: Mode Contract (JTBD-002)

## Purpose

Make plan vs build intent explicit and unambiguous for every loop execution.

## Scope

- Required mode argument for loop commands.
- Mode semantics for plan vs build.

## Out of scope

- Prompt templates (defined in separate specs).
- Completion promise format (defined in separate specs).

## Behavioral requirements

- `run` and `step` require an explicit mode argument: `plan` or `build`.
- Mode selection is visible at run start.
- Mode changes are not inferred implicitly.

## Acceptance criteria

- `ralphctl run plan` and `ralphctl run build` start successfully.
- Any other mode value fails with a clear error.
- Logs include the chosen mode before the first iteration begins.
