# CLI Usage Reference

## Installation

```bash
bun install
```

## Commands

### `run <plan|build>`
Run a Ralph loop in the specified mode.

```bash
ralphctl run plan
ralphctl run build
```

### `step <plan|build>`
Run a single interactive iteration for debugging.

```bash
ralphctl step plan
ralphctl step build
```

### `inspect`
Inspect run exports and view session history.

```bash
ralphctl inspect
```

### `init`
Initialize default prompt templates in the current directory.

```bash
ralphctl init
```

## Help

```bash
ralphctl --help
ralphctl run --help
```

## Version

```bash
ralphctl --version
```

## Alias

You can also use `rctl` as a shorter alias for all commands.

```bash
rctl run plan
rctl init
```
