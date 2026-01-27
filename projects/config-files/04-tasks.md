# Task Breakdown: config-files

## JTBD-001: Config File Discovery and Loading

| Task ID | Description | Depends On |
|---------|-------------|------------|
| 001-001 | Install c12 dependency | None |
| 001-002 | Define Zod schema for config options | None |
| 001-003 | Create config loader module with c12 integration | 001-001, 001-002 |
| 001-004 | Add `--config` flag to all commands in cli.ts | 001-003 |

---

## JTBD-002: Config Merging with Priority

| Task ID | Description | Depends On |
|---------|-------------|------------|
| 002-001 | Implement CLI flag filtering (remove undefined values) | 001-003 |
| 002-002 | Implement merge logic with correct priority order | 002-001 |

---

## JTBD-003: Config Validation and Error Handling

| Task ID | Description | Depends On |
|---------|-------------|------------|
| 003-001 | Add Zod validation with custom error messages | 002-002 |
| 003-002 | Add source tracking to report which file caused errors | 003-001 |
| 003-003 | Write tests for config loading, merging, and validation | 003-002 |

---

## Dependency Graph

```
001-001 ──┐
          ├──> 001-003 ──> 001-004
001-002 ──┘       │
                  ↓
              002-001 ──> 002-002 ──> 003-001 ──> 003-002 ──> 003-003
```

---

## Dependency Matrix

| Task ID | Description | Depends On | Blocks |
|---------|-------------|------------|--------|
| 001-001 | Install c12 dependency | None | 001-003 |
| 001-002 | Define Zod schema for config options | None | 001-003 |
| 001-003 | Create config loader module with c12 integration | 001-001, 001-002 | 001-004, 002-001 |
| 001-004 | Add `--config` flag to all commands in cli.ts | 001-003 | None |
| 002-001 | Implement CLI flag filtering (remove undefined values) | 001-003 | 002-002 |
| 002-002 | Implement merge logic with correct priority order | 002-001 | 003-001 |
| 003-001 | Add Zod validation with custom error messages | 002-002 | 003-002 |
| 003-002 | Add source tracking to report which file caused errors | 003-001 | 003-003 |
| 003-003 | Write tests for config loading, merging, and validation | 003-002 | None |

---

## Linearized Implementation Order

```
Wave 1: 001-001, 001-002 (parallel, no dependencies)
Wave 2: 001-003 (depends on Wave 1)
Wave 3: 001-004, 002-001 (parallel, depend on 001-003)
Wave 4: 002-002 (depends on 002-001)
Wave 5: 003-001 (depends on 002-002)
Wave 6: 003-002 (depends on 003-001)
Wave 7: 003-003 (depends on 003-002)
```
