# Core Expectations

## Feedback Loops and Verifiabilty

### typesafety
The bare minimum feedback loop that must be used in almost every change you do is the "typecheck" loop, this is a typescript repository, and we have to aim to write typesafe code that gives feedback on the wrong side. and also use the bun script to actually check if the code is right

### code review
when finalising a change, pre-commit, get a review from the kai-impersonator agent, and address all changes suggested. By addressing, it doesn't mean to just change code, you are allowed to push back if it doesn't make sense, but think through what is required objectively.

### testing

for writing tests, use bun:test.

## package manager
we use bun as the package manager here. do not try to change that.

## future proof maintainable code
we want our code to be simple, not over-complicated and maintainable. at the same time we do want to ensure that things are specific to external deps like 'opencode' are written in a way where we can swap or extend them to support claude code, amp etc.

to do this, we dont want over-engineering, we just wwant good engineering that writes the main logic code / business logic in the domain that's relecant to the application, and not inline implementation detial logic. the code must read like prose.

keep your business logic decoupled from the entrypoints and specific external libraries, and the main file should use your 'domain' instead
# Learnings {this is where your learnings go}
