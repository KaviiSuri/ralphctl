# Spec: State Capture (JTBD-005)

## Purpose

Persist iteration session data so `inspect` can reconstruct the full run history.

## Scope

- Session tracking stored at `.ralphctl/ralph-sessions.json`.
- Minimum required fields per iteration.

## Out of scope

- Export formatting (handled in inspect specs).

## Behavioral requirements

- Session tracking is written to `.ralphctl/ralph-sessions.json`.
- Each iteration entry includes at minimum:
  - `iteration`
  - `sessionId`
  - `startedAt`
  - `mode`
- The file is updated after each iteration completes.

## Acceptance criteria

- After a run, `.ralphctl/ralph-sessions.json` exists and contains one entry per iteration.
- The file is valid JSON and can be read by tooling.
