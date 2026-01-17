# Spec: Command Surface (JTBD-001)

## Purpose

Define the minimal command surface required to operate the product with predictable, low-friction usage.

## Scope

- Core commands: `run`, `step`, `inspect`, `init`.
- Required mode argument (`plan` or `build`) for commands that execute prompts.
- Research a good zod-based typesafe CLI library that you can use, keep your business logic decoupled from the library, and the main file should use your 'domain' instead

## Out of scope

- Additional subcommands beyond the core set.
- Advanced command routing or plugin systems.

## Behavioral requirements

- The CLI exposes exactly four core commands: `run`, `step`, `inspect`, `init`.
- `run` and `step` require a positional mode argument (`plan` or `build`).
- Invalid or missing modes return a clear error and usage guidance.

## Acceptance criteria

- `ralphctl --help` lists only the four core commands.
- `ralphctl run` and `ralphctl step` fail without an explicit `plan|build` mode.
- `ralphctl inspect` and `ralphctl init` do not require a mode argument.
- do not build your  own cli parsing utility, lookup something off the shelf please.
