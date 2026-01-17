# Spec: Safe Overwrites (JTBD-004)

## Purpose

Prevent accidental loss of customized prompts when running `init`.

## Scope

- Confirmation prompt when prompt files already exist.
- `--force` override to bypass confirmation.

## Out of scope

- Advanced backup or versioning strategies.

## Behavioral requirements

- If `PROMPT_plan.md` or `PROMPT_build.md` exists, `init` prompts with a `y/N` confirmation.
- `--force` skips confirmation and overwrites existing files.

## Acceptance criteria

- Running `ralphctl init` with existing prompt files prompts before overwrite.
- Running `ralphctl init --force` overwrites without prompting.
