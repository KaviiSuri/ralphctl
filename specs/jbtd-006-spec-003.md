# Spec: Inspect Schema (JTBD-006)

## Purpose

Define the minimum schema for each entry in the inspect artifact so downstream tooling can rely on consistent fields.

## Scope

- Required fields per session entry.

## Out of scope

- Additional optional fields or metadata expansion.

## Behavioral requirements

- Each entry in the inspect array includes:
  - `sessionId`
  - `iteration`
  - `startedAt`
  - `export`

## Acceptance criteria

- Each entry in the inspect output includes all required fields.
- Missing fields are treated as an error during inspection generation.
