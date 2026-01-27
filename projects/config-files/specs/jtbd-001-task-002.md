# Spec: 001-002 - Define Zod schema for config options

## JTBD Reference
JTBD-001: Config File Discovery and Loading

## Purpose
Create a Zod validation schema for configuration options that will be used to validate config files and CLI flag overrides. This schema serves as the source of truth for all configuration fields and ensures type safety and correct values throughout the application.

## Scope
### In Scope
- Define Zod schema with all five configuration fields: `smartModel`, `fastModel`, `agent`, `maxIterations`, `permissionPosture`
- Make all fields optional to support partial configs from any source
- Define allowed enum values for `agent` ("opencode" and "claude-code") and `permissionPosture` ("allow-all" and "ask")
- Document field types and constraints in code comments
- Export schema as a named export for reuse throughout the application

### Out of Scope
- Custom error messages (basic Zod error messages are acceptable)
- Default value assignment in the schema (defaults handled elsewhere)
- Integration with config loading or merging logic
- Unit tests for the schema (covered in JTBD-003)

## Acceptance Criteria
- [ ] Zod schema defined in a new module (recommended: `src/config/schema.ts`)
- [ ] All five fields present: `smartModel`, `fastModel`, `agent`, `maxIterations`, `permissionPosture`
- [ ] All fields are optional (using `.optional()`)
- [ ] `smartModel` and `fastModel` are string types
- [ ] `maxIterations` is a number type
- [ ] `agent` is an enum with values ["opencode", "claude-code"]
- [ ] `permissionPosture` is an enum with values ["allow-all", "ask"]
- [ ] Schema is exported and can be imported by other modules
- [ ] TypeScript type can be inferred from schema using `z.infer<typeof schema>`

## Implementation Notes

### Schema Definition
The schema should match the structure defined in the research document. This is the core validation layer for the entire config system.

```typescript
// Example structure (implement according to Zod best practices)
const ConfigSchema = z.object({
  smartModel: z.string().optional(),
  fastModel: z.string().optional(),
  agent: z.enum(["opencode", "claude-code"]).optional(),
  maxIterations: z.number().optional(),
  permissionPosture: z.enum(["allow-all", "ask"]).optional(),
});
```

### Field Details
- **smartModel**: Default in code is `openai/gpt-5.2-codex` (opencode) or `claude-opus-4-5` (claude-code)
- **fastModel**: Default in code is `zai-coding-plan/glm-4.7` (opencode) or `claude-sonnet-4-5` (claude-code)
- **agent**: Valid values are "opencode" and "claude-code"; default is "opencode"
- **maxIterations**: Default is 10; should be a positive integer
- **permissionPosture**: Valid values are "allow-all" and "ask"; default is "allow-all"

### Type Inference
Export both the schema and an inferred type for use throughout the codebase:
```typescript
export type AppConfig = z.infer<typeof ConfigSchema>;
```

This ensures consistency between the schema and the TypeScript type used in command handlers.

## Dependencies
- Depends on: None
- Blocks: 001-003 (Create config loader module with c12 integration)
