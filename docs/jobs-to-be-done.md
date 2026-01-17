# Jobs To Be Done

## Product intent

Deliver a focused, CLI-first Ralph controller for OpenCode that preserves the original “dumb loop” philosophy while making plan/build work loops operationally safe, inspectable, and repeatable. The product should feel predictable, minimal, and production-ready without inventing new formats or behaviors that diverge from OpenCode.

## JTBD

### JTBD-1: Keep the CLI surface minimal and idiomatic
As a developer, I need the command surface to be small, predictable, and aligned to OpenCode usage so adoption is low-friction.

Topics of concern (priority order):
- Command surface: `run`, `step`, `inspect`, and `init` are the only core commands.
- OpenCode alignment: Commands delegate to OpenCode CLI behavior rather than SDK-only workflows.
- Naming + aliases: The CLI is `ralphctl` with a built-in `rctl` alias.

### JTBD-2: Run a deterministic Ralph loop with a clear mode contract
As a developer, I need to run a loop that is explicit about its intent (plan vs build) so that each iteration behaves predictably and the system never guesses what I meant.

Topics of concern (priority order):
- Mode contract: `plan` and `build` are required positional arguments for runs.
- Mode prompt defaults: Each mode resolves to a default prompt template when no custom prompt is supplied.
- Loop termination: Completion promise and max-iteration limits are enforced consistently and visibly.
- Model defaults: `{smart}` and `{fast}` model defaults are applied when no overrides are supplied.

### JTBD-3: Run unattended without permission friction
As a developer, I need the loop to proceed without permission prompts so it can run unattended in long iterations.

Topics of concern (priority order):
- Default allow-all: Runs default to allow-all permissions unless explicitly overridden.
- Permission clarity: The chosen permission posture is visible at run start.

### JTBD-4: Bootstrap from a high-quality default setup
As a developer, I need an initializer that gives me production-grade prompt templates so I can start immediately and adjust from a strong baseline.

Topics of concern (priority order):
- Prompt scaffolding: `init` writes `PROMPT_plan.md` and `PROMPT_build.md` with the default templates.
- Safe overwrites: Existing prompts are never overwritten without explicit confirmation or `--force`.
- Idempotent setup: Re-running `init` leaves the project in a valid state.

### JTBD-5: Keep every iteration isolated and auditable
As a developer, I need each iteration to be a fresh OpenCode session so context never leaks across attempts and I can inspect the history later with full fidelity.

Topics of concern (priority order):
- Session isolation: Every iteration starts a new session with no continuation.
- Session identification: Session IDs are captured reliably for each iteration.
- Iteration visibility: Iteration boundaries are visible in output so runs are easy to follow.
- State capture: Session tracking is written to `.ralphctl/ralph-sessions.json`.

### JTBD-6: Preserve native OpenCode exports as the source of truth
As a developer, I need a single run artifact that preserves OpenCode’s native export format so audits and tooling can consume it without translation.

Topics of concern (priority order):
- Export fidelity: Exported sessions remain in exact OpenCode JSON shape.
- Run artifact packaging: One JSON file per run contains all session exports.
- Inspect schema: Each entry includes `sessionId`, `iteration`, `startedAt`, and the raw `export` payload.

### JTBD-7: Step through a single iteration interactively
As a developer, I need to run one iteration in the OpenCode TUI for debugging so I can watch and intervene before committing to a full loop.

Topics of concern (priority order):
- Interactive step: `step` launches the TUI with `--prompt` for a single iteration.
- Manual exit: The session remains interactive until I choose to exit.
- Shared args: `step` accepts the same mode-aware arguments as `run` wherever they apply.

## Non-goals (for v0)

- No plan-work or scoped planning modes.
- No server attach or remote TUI orchestration.
- No custom transcript rendering or human-readable export formats.
- No persistence beyond session tracking and inspect output.

## Deliverables

- `ralphctl` CLI with `rctl` alias and the `run`, `step`, `inspect`, `init` commands.
- `ralphctl run <plan|build>` command that executes the OpenCode CLI loop.
- `ralphctl step <plan|build>` command that launches the OpenCode TUI with `--prompt` for a single iteration.
- `ralphctl inspect` command that outputs a JSON file containing raw OpenCode exports per session.
- `ralphctl init` command that writes default prompt templates with overwrite confirmation or `--force`.
- Session tracking stored in `.ralphctl/ralph-sessions.json`.
