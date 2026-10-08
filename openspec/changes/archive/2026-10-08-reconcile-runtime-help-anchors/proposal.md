## Why

Two specs contradict each other. `runtime-help-drift-guard` requires the
runtime help registry in `src/runtime-help.ts` to own its docs, spec, and test
anchors; `architecture-enhance` moved them there on 2026-06-26 so that each
help entry is defined in one place. `pi-vim-documentation` still says runtime
modules must not carry spec paths, test paths, or anchors, which predates that
move and was never updated.

## What Changes

- Rename and rewrite the `pi-vim-documentation` requirement "Documentation
  drift metadata stays out of runtime help paths" so it matches the code and
  the drift-guard spec: runtime help entries carry their own drift anchors,
  and read-only popup command metadata stays in test-owned sources.
- No code or user-facing behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-vim-documentation`: drift metadata ownership matches
  `runtime-help-drift-guard`.

## Impact

`openspec/specs/pi-vim-documentation/spec.md` only.
