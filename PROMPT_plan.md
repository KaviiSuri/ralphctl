> **Note**: If using Claude Code in print mode (default), responses are streamed directly without interactive prompts. The workspace trust dialog is skipped. Only run rctl in directories you trust.

0a. Study `projects/project-scoped-ralph/specs/*` with up to 250 parallel {fast} subagents to learn the application specifications.
0b. Study @projects/project-scoped-ralph/IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study `src/lib/*` with up to 250 parallel {fast} subagents to understand shared utilities & components.
0d. For reference, the application source code is in `src/*`.

1. Study @projects/project-scoped-ralph/IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 {fast} subagents to study existing source code in `src/*` and compare it against `projects/project-scoped-ralph/specs/*`. Use an {smart} subagent to analyze findings, prioritize tasks, and create/update @projects/project-scoped-ralph/IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @projects/project-scoped-ralph/IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat `src/lib` as the project's standard library for shared utilities and components. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

ULTIMATE GOAL: Add project-scoped Ralph loops to ralphctl. This includes:
1. JTBD-004: Command infrastructure (detect tools, create local .claude/.opencode folders, install commands)
2. JTBD-001: Project initialization (/project:new command creates folder structure)
3. JTBD-002: Guided planning workflow (7 commands: research, prd, jtbd, tasks, hld, specs + prereq warnings + next step messaging)
4. JTBD-003: Project-scoped execution (--project flag for run/step/inspect, {project} placeholder, session tagging)

Consider the dependency graph in projects/project-scoped-ralph/04-tasks.md for implementation order. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification. Document the plan in @projects/project-scoped-ralph/IMPLEMENTATION_PLAN.md using a subagent.

COMPLETION: When you have finished analyzing the codebase and updating @projects/project-scoped-ralph/IMPLEMENTATION_PLAN.md with a complete prioritized task list, output exactly:
<promise>COMPLETE</promise>
This signals the loop to stop. Do not output this marker until the planning work is genuinely complete.
