# Spec: Shared Args for Step (JTBD-007)

## Purpose

Ensure `step` accepts the same mode-aware arguments as `run` so debugging behavior matches loop behavior.

## Scope

- Prompt overrides and model overrides for `step`.
- Permission posture parity with `run`.

## Out of scope

- Export and inspection behavior.

## Behavioral requirements

- `step` accepts the same prompt override inputs as `run`.
- `step` accepts model overrides for `{smart}` and `{fast}`.
- `step` uses the same default allow-all permission posture as `run` unless overridden.

## Acceptance criteria

- A prompt override supplied to `step` is used in the TUI launch.
- Model overrides supplied to `step` are applied consistently with `run`.
- Permission posture matches `run` when no overrides are provided.
