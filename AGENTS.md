# Core Expectations

## Feedback Loops and Verifiabilty

### typesafety
The bare minimum feedback loop that must be used in almost every change you do is the "typecheck" loop, this is a typescript repository, and we have to aim to write typesafe code that gives feedback on the wrong side. and also use the bun script to actually check if the code is right

### code review
when finalising a change, pre-commit, get a review from the kai-impersonator agent, and address all changes suggested. By addressing, it doesn't mean to just change code, you are allowed to push back if it doesn't make sense, but think through what is required objectively.

### testing

for writing tests, use bun:test.

## Search and Research

to lookup things in detail like looking up general guidance from docs etc, we should use subagents to explore and find ideas. you can look up direclty in codebase or web if it's a specific lookup that's asking a specific question and not wider.

## package manager
we use bun as the package manager here. do not try to change that.

## future proof maintainable code
we want our code to be simple, not over-complicated and maintainable. at the same time we do want to ensure that things are specific to external deps like 'opencode' are written in a way where we can swap or extend them to support claude code, amp etc.

to do this, we dont want over-engineering, we just wwant good engineering that writes the main logic code / business logic in the domain that's relecant to the application, and not inline implementation detial logic. the code must read like prose.

keep your business logic decoupled from the entrypoints and specific external libraries, and the main file should use your 'domain' instead

# Learnings 
Keep Learnings up to date as you find new facts about the requirements, the codebase and new learnings. add them in this section after you are done with each step.

- Using Bun.spawn for CLI execution provides better control and visibility than SDK
- Decoupling business logic from CLI library enables swapping CLIs easily
- Mock-based testing of handlers validates correct adapter usage without external deps
- Loop termination uses <promise>COMPLETE</promise> marker from OpenCode
- Testing loop handler requires mocking adapter methods and prompt resolver
- Default max-iterations of 10 balances protection and utility
- Iteration markers (--- Iteration N/M ---) provide clear progress visibility
- Manual interruption handling requires catching AbortError specifically
- Testing multiple iterations uses closure-based counters in mocks
- Optional fields in TypeScript interfaces work well for backward compatibility - just spread existing session object and add new field
- Migration logic in state reading handles old sessions gracefully by setting undefined for missing fields
- String replacement with replaceAll() is simple and effective for placeholder resolution
- Mock.module in Bun tests affects all tests globally - mocks must implement the same logic as real code to avoid test interference
- Bun test suite provides good confidence - 108 tests verify no regressions when adding features
