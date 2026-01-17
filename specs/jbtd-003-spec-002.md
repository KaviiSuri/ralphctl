# Spec: Permission Posture Visibility (JTBD-003)

## Purpose

Make the effective permission posture explicit so operators can trust unattended runs.

## Scope

- Run-start messaging for permission posture.

## Out of scope

- Permission configuration mechanics.

## Behavioral requirements

- Each `run` and `step` prints the effective permissions posture before the first iteration starts.
- The message is clear enough to confirm whether allow-all is active.

## Acceptance criteria

- Starting `ralphctl run build` prints an explicit permission posture line.
- The printed posture matches the actual permissions in effect.
