# Spec: 002-001 - Implement CLI flag filtering (remove undefined values)

## JTBD Reference
JTBD-002: Config Merging with Priority

## Purpose
Create a `filterUndefined` helper function that removes undefined values from CLI flag objects. This is a critical prerequisite for proper config merging, since CLI frameworks pass all flag options even when not specified by the user (as `undefined`). Without filtering, these undefined values would override loaded config values, breaking the priority hierarchy.

## Scope

### In Scope
- Create a `filterUndefined` utility function in the config loader module
- Function removes all properties with `undefined` values from an object
- Function must handle nested objects (if applicable)
- Function must preserve `null` values (only filter `undefined`)
- Add TypeScript types to maintain type safety
- Function is reusable for any object needing undefined value removal

### Out of Scope
- Filtering of other falsy values (0, empty strings, false remain in output)
- Config validation (handled by JTBD-003)
- Actual merging of configs (handled by task 002-002)
- Integration with CLI command handlers (handled by task 001-004)

## Acceptance Criteria
- [ ] `filterUndefined` function exists in config loader module
- [ ] Function correctly removes all undefined values from an object
- [ ] Function preserves all non-undefined values (including null, 0, empty strings, false)
- [ ] Function works with CLI flag objects (flat structure with optional string/number/enum properties)
- [ ] Function has proper TypeScript types (generic with object input/output)
- [ ] Function can be imported and used by merge logic in task 002-002
- [ ] Unit tests pass for edge cases (empty object, all undefined, no undefined, null values)

## Implementation Notes

### Helper Function Location
The `filterUndefined` function should be implemented in the config loader module created in task 001-003 (likely `src/config.ts` or similar).

### Function Signature
```typescript
function filterUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
```

### Why This Is Needed
When CLI frameworks like Clerc parse command-line arguments, they return an options object with all defined flags. Any flags not passed by the user are set to `undefined`. If we merged this options object directly with loaded config without filtering:

```
// Config file has: { smartModel: "claude-opus-4-5" }
// User runs: rctl run --agent claude-code (no --smart-model flag)
// Options object has: { smartModel: undefined, agent: "claude-code" }
// Unfiltered merge would: { smartModel: undefined, agent: "claude-code" }
// Result: undefined overwrites config value!
```

With `filterUndefined`:
```
// Filtered options: { agent: "claude-code" }
// Merge with config: { smartModel: "claude-opus-4-5", agent: "claude-code" }
// Result: Correct priority is maintained!
```

### Edge Cases to Handle
- Empty object `{}` → returns `{}`
- All values undefined `{ a: undefined, b: undefined }` → returns `{}`
- No undefined values `{ a: "x", b: 2 }` → returns all values unchanged
- Mixed falsy values `{ a: 0, b: false, c: "", d: null, e: undefined }` → returns all except `e`
- Nested objects: If config supports nested structures (unlikely in this case), function may need to recursively filter

## Dependencies
- Depends on: 001-003 (Config loader module must exist)
- Blocks: 002-002 (Merge logic depends on filtered CLI flags)
