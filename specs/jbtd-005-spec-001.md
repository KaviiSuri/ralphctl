# Spec: Session Isolation (JTBD-005)

## Purpose

Ensure each iteration runs in a fresh OpenCode session with no hidden continuation.

## Scope

- One session per iteration for `run`.

## Out of scope

- Session export and inspection.
- Step/TUI behavior.

## Behavioral requirements

- Each iteration of `run` starts a new OpenCode session.
- No iteration continues or reuses prior sessions.

## Acceptance criteria

- Two consecutive iterations produce two distinct session IDs.
- No `--continue` or `--session` options are used implicitly for looping.
