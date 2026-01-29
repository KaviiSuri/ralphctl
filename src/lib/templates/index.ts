export const PLAN_TEMPLATE = `0a. Study \`{project}/specs/*\` with up to 250 parallel {fast} subagents to learn the application specifications.
0b. Study @{project}/IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study \`src/lib/*\` with up to 250 parallel {fast} subagents to understand shared utilities & components.
0d. For reference, the application source code is in \`src/*\`.

1. Study @{project}/IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 {fast} subagents to study existing source code in \`src/*\` and compare it against \`{project}/specs/*\`. Use an {smart} subagent to analyze findings, prioritize tasks, and create/update @{project}/IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @{project}/IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

2. The whole plan must be trackable using checkboxes so humans can review it easily.

FORMAT: Keep IMPLEMENTATION_PLAN.md clean:
- \`- [ ] Task name\` (pending) or \`- [x] Task name\` (complete)
- Group by section/wave if needed
- NO implementation notes, NO learnings, NO verbose completion logs
- Details belong in specs, not in the plan

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat \`src/lib\` as the project's standard library for shared utilities and components. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

ULTIMATE GOAL: We want to achieve [project-specific goal]. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at {project}/specs/FILENAME.md and add a checkbox for it in @{project}/IMPLEMENTATION_PLAN.md.

OUTPUT: In your response, clearly list:
- Any NEW specs you created
- Any NEW tasks you added to the plan
- So the user can review what changed before proceeding
`;

export const BUILD_TEMPLATE = `0a. Study \`{project}/specs/*\` with up to 500 parallel {fast} subagents to learn the application specifications.
0b. Study @{project}/IMPLEMENTATION_PLAN.md.
0c. For reference, the application source code is in \`src/*\`.

1. Your task is to implement functionality per the specifications using parallel subagents. Follow @{project}/IMPLEMENTATION_PLAN.md and choose the most important item to address. Before making changes, search the codebase (don't assume not implemented) using {fast} subagents. You may use up to 500 parallel {fast} subagents for searches/reads and only 1 {fast} subagent for build/tests. Use {smart} subagents when complex reasoning is needed (debugging, architectural decisions).
2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.
3. When you discover issues, add them as checkboxes in @{project}/IMPLEMENTATION_PLAN.md (not prose paragraphs). When resolved, mark complete and remove.
4. When the tests pass, update @{project}/IMPLEMENTATION_PLAN.md, then \`git add -A\` then \`git commit\` with a message describing the changes. After the commit, \`git push\`.
5. stop after one spec is done. you do not need to keep going to other specs.

99999. Important: When authoring documentation, capture the why — tests and implementation importance.
999999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1  if 0.0.0 does not exist.
99999999. You may add extra logging if required to debug issues.
999999999. Keep @{project}/IMPLEMENTATION_PLAN.md current by marking checkboxes complete and adding new issues as checkboxes. Do NOT append verbose completion logs or prose paragraphs — keep it as a clean checklist.
9999999999. When you learn something new, add it to a \`## Learnings\` section in @AGENTS.md. Keep learnings specific and actionable — like organizational memory for the team (e.g., correct commands, file locations, gotchas discovered).
99999999999. For any bugs you notice, resolve them or add a checkbox for them in @{project}/IMPLEMENTATION_PLAN.md so the next agent can address them.
999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
9999999999999. When @{project}/IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.
99999999999999. If you find inconsistencies in the {project}/specs/* then use an {smart} 4.5 subagent with 'ultrathink' requested to update the specs.
999999999999999. IMPORTANT: @AGENTS.md is for operational learnings (commands, how to run things). @{project}/IMPLEMENTATION_PLAN.md is for status tracking (checkboxes). Neither should have verbose prose or append-only logs.
ULTIMATE GOAL: We want to achieve [project-specific goal]. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at {project}/specs/FILENAME.md. If you create a new element then document the plan to implement it in @{project}/IMPLEMENTATION_PLAN.md using a subagent.`;
