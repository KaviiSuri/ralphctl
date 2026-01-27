# Spec: 003-001 - Add Zod validation with custom error messages

## JTBD Reference
JTBD-003: Config Validation and Error Handling

## Purpose
Implement comprehensive Zod validation for merged configuration with custom error messages that clearly guide users on how to fix invalid values. This ensures that configuration errors are caught early with actionable feedback before attempting to execute commands.

## Scope

### In Scope
- Add Zod schema validation with custom error messages for all config fields
- Provide helpful error messages for invalid enum values (e.g., invalid `agent` or `permissionPosture`)
- Provide helpful error messages for invalid types (e.g., non-numeric `maxIterations`)
- Validate the merged configuration object after all sources (CLI, explicit config, project, global) have been combined
- Ensure validation happens before config is returned and used by command handlers
- Support optional fields (all config fields are optional)
- Custom messages should indicate valid enum values and expected types

### Out of Scope
- Source tracking for which file caused the error (handled in 003-002)
- Test coverage (handled in 003-003)
- Interactive error recovery or auto-correction
- Environment variable validation (only config files and CLI flags)
- Configuration file discovery or loading (handled in 001-003)
- Config merging logic (handled in 002-002)

## Acceptance Criteria

- [ ] Define Zod schema with custom error messages for all fields (`smartModel`, `fastModel`, `agent`, `maxIterations`, `permissionPosture`)
- [ ] Enum fields (`agent`, `permissionPosture`) display valid values in error messages
- [ ] Type mismatches display expected types in error messages (e.g., "maxIterations must be a number")
- [ ] Validation is applied to merged config before being returned from the config loader
- [ ] Valid configs pass validation without modification
- [ ] Invalid configs throw ZodError with descriptive messages
- [ ] All optional fields remain optional (validation passes even if omitted)
- [ ] Validation logic is reusable and testable (exported function or method)

## Implementation Notes

### Zod Custom Error Messages

Use Zod's `.refine()` or `.superRefine()` for custom error messages on enum fields to display valid options:

```typescript
const ConfigSchema = z.object({
  smartModel: z.string().optional(),
  fastModel: z.string().optional(),
  agent: z
    .enum(["opencode", "claude-code"])
    .optional()
    .refine(
      (val) => val === undefined || ["opencode", "claude-code"].includes(val),
      {
        message: "agent must be 'opencode' or 'claude-code'",
      }
    ),
  maxIterations: z
    .number()
    .optional()
    .refine((val) => val === undefined || Number.isInteger(val), {
      message: "maxIterations must be a whole number",
    }),
  permissionPosture: z
    .enum(["allow-all", "ask"])
    .optional()
    .refine(
      (val) => val === undefined || ["allow-all", "ask"].includes(val),
      {
        message: "permissionPosture must be 'allow-all' or 'ask'",
      }
    ),
});
```

### Key Considerations

- Use `.optional()` on all fields to allow partial configs
- Prioritize clarity: error messages should show valid values explicitly
- Consider using `.superRefine()` if multiple custom validations are needed
- The schema will be applied after merging in the config loader (see 002-002)
- Keep the schema definition in the same module as the config loader for cohesion

## Dependencies
- Depends on: 002-002 (Implement merge logic with correct priority order)
- Blocks: 003-002 (Add source tracking to report which file caused errors)
