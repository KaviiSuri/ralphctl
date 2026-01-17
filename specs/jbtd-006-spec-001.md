# Spec: Export Fidelity (JTBD-006)

## Purpose

Guarantee that inspection output preserves OpenCode’s native export JSON without transformation.

## Scope

- `inspect` uses `opencode export` to fetch raw session exports.

## Out of scope

- Any post-processing or human-readable formatting.

## Behavioral requirements

- `inspect` captures the raw output of `opencode export <sessionId>`.
- No transformation is applied to the export payload.

## Acceptance criteria

- Export payloads in the inspect artifact match the output of `opencode export` exactly.
