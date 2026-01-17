# Spec: Naming and Aliases (JTBD-001)

## Purpose

Provide a stable, unambiguous CLI name with a short alias for daily use.

## Scope

- Canonical command name and supported alias.

## Out of scope

- Additional aliases or alternative entrypoints.

## Behavioral requirements

- The canonical CLI command is `ralphctl`.
- A built-in alias `rctl` behaves identically to `ralphctl`.

## Acceptance criteria

- `ralphctl --help` and `rctl --help` produce the same output.
- `rctl run plan` and `ralphctl run plan` behave identically.
