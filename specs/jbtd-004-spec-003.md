# Spec: Idempotent Setup (JTBD-004)

## Purpose

Ensure repeated initialization does not leave the project in a broken or inconsistent state.

## Scope

- Re-running `init` with or without existing prompt files.

## Out of scope

- Cleaning or resetting additional project artifacts.

## Behavioral requirements

- Running `init` multiple times always results in valid prompt templates in place.
- If prompts are not overwritten, the existing templates remain intact.

## Acceptance criteria

- Running `ralphctl init` twice produces a valid working setup each time.
- The second run does not corrupt prompt contents or leave partial files.
