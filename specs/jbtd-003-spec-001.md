# Spec: Default Allow-All Permissions (JTBD-003)

## Purpose

Allow unattended runs to proceed without permission prompts by default.

## Scope

- Default allow-all permissions for `run` and `step`.
- Ability to override the default posture.

## Out of scope

- Fine-grained permission selection UI.
- Persistent permission profiles.

## Behavioral requirements

- `run` and `step` default to allow-all permissions unless explicitly overridden.
- The permission posture is visible at run start.

## Acceptance criteria

- `ralphctl run plan` proceeds without permission prompts in OpenCode.
- Output indicates that allow-all permissions are active.
- An override path exists and changes the posture.
