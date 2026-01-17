# Spec: Iteration Visibility (JTBD-005)

## Purpose

Make iteration boundaries obvious to operators so runs are easy to follow and debug.

## Scope

- Start and end markers per iteration.
- Include iteration number and session ID in markers.

## Out of scope

- Log formatting beyond boundary markers.

## Behavioral requirements

- Each iteration logs a start marker with iteration number and session ID.
- Each iteration logs an end marker with iteration number and session ID.

## Acceptance criteria

- Operators can identify iteration boundaries in output without ambiguity.
- Markers include both iteration number and session ID.
