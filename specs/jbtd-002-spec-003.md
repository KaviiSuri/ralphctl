# Spec: Loop Termination (JTBD-002)

## Purpose

Ensure the loop stops only for explicit, visible reasons, preserving determinism and operator confidence.

## Scope

- Completion promise detection.
- Max iteration handling.
- Manual interruption behavior.

## Out of scope

- Prompt templates.
- Session export and inspect behavior.

## Behavioral requirements

- The completion promise is `<promise>COMPLETE</promise>` and is required for loop completion.
- The loop stops when the completion promise is detected in output.
- If `max iterations` is set and reached, the loop stops with a clear message.
- Manual interruption stops the loop gracefully.

## Acceptance criteria

- A run that outputs `<promise>COMPLETE</promise>` terminates successfully.
- A run that never outputs the promise terminates only at max iterations or manual interrupt.
- Reaching max iterations produces a clear terminal message.
