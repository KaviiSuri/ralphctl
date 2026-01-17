# Spec: Interactive Step (JTBD-007)

## Purpose

Allow operators to run a single iteration in the OpenCode TUI for debugging and intervention.

## Scope

- `step` launches `opencode` TUI with `--prompt`.
- Uses the resolved prompt for the selected mode.

## Out of scope

- Loop behavior across multiple iterations.
- Server attach or remote TUI.

## Behavioral requirements

- `step` requires a positional mode argument (`plan` or `build`).
- The TUI starts via `opencode --prompt "<resolved prompt>"`.
- The session remains open until the user exits manually.

## Acceptance criteria

- `ralphctl step plan` launches the TUI with the plan prompt injected.
- The command does not auto-exit after a single response.
