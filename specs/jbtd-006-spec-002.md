# Spec: Run Artifact Packaging (JTBD-006)

## Purpose

Produce a single JSON artifact per run that aggregates all session exports in order.

## Scope

- Output is a JSON array of session objects in iteration order.
- Each entry corresponds to one iteration.

## Out of scope

- Storage of intermediate files outside the final artifact.

## Behavioral requirements

- The inspect output is a single JSON file.
- The file contains an array with one entry per iteration, ordered by iteration.

## Acceptance criteria

- The inspect output is valid JSON and readable by `jq`.
- The array length matches the number of recorded iterations.
