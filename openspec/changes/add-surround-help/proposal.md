## Why

Surround shipped without a `:help` topic; `:help surround` reports no match.
The `add-surround` change deferred the entry until the `vim-surround` spec was
archived, which it now is.

## What Changes

- `:help surround` (also `ys`, `yss`, `ds`, `cs`) shows a compact runtime help
  entry with keys, examples, and limits, backed by the `vim-surround` spec and
  a `<!-- runtime-help:surround -->` anchor in `docs/features.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-surround`: runtime help covers surround.

## Impact

`src/runtime-help.ts`, `docs/features.md`, `test/runtime-help.test.ts`.
