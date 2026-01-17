# Spec: Session Identification (JTBD-005)

## Purpose

Capture session IDs reliably for every iteration to support inspection and traceability.

## Scope

- Session ID extraction per iteration.
- Reliability even if output format changes.

## Out of scope

- Export formatting.
- Storage location and schema (handled in state capture spec).

## Behavioral requirements

- Each iteration produces a captured session ID.
- The capture method is resilient to output format variations.

## Acceptance criteria

- After a multi-iteration run, every iteration has a recorded session ID.
- The recorded IDs match those visible in OpenCode session listings.
