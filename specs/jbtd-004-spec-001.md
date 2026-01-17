# Spec: Prompt Scaffolding (JTBD-004)

## Purpose

Provide a default baseline by writing prompt templates into the working directory so users can start immediately and customize later.

## Scope

- `ralphctl init` writes `PROMPT_plan.md` and `PROMPT_build.md`.
- Template content must be verbatim as defined in the mode prompt defaults spec.

## Out of scope

- Additional scaffold files beyond the prompt templates.

## Behavioral requirements

- `init` creates `PROMPT_plan.md` and `PROMPT_build.md` in the current directory.
- The created files match the verbatim template content.

## Acceptance criteria

- Running `ralphctl init` in a new directory produces both prompt files.
- The file contents match the templates exactly.
