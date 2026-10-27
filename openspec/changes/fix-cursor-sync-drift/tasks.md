# Tasks

## 1. Adapter cursor seam

- [x] 1.1 Add `setBufferCursor(position)` to `VimEditor` (narrow structural
  cast for `state.cursorLine` + `setCursorCol`, feature detection, public
  `getCursor()` read-back verification) and extract the existing replay loop
  into `replayCursorKeys(target)`; verify with a focused unit test that the
  seam lands the cursor at an exact position in a multi-line prompt
- [x] 1.2 Route `restoreCursor` through the seam with fallback to
  `replayCursorKeys`; verify the five drift repros in
  `test/cursor-sync-drift-repro.test.ts` (dropping `test.fails`) pass

## 2. Engine-computed directional motions

- [x] 2.1 Change `moveEffectFor` in `src/modal/normal.ts` to emit
  `restoreCursor` effects for `down`/`up` via `moveByPromptLines` and for
  `left`/`right` via bounded column moves; verify `j`/`k`/`h`/`l` tests in
  `test/modal/motions.test.ts` and `test/vim-editor.test.ts` still pass
- [x] 2.2 Add motion tests for logical-line semantics: `j`/`k` across
  wrapped lines, `h`/`l` clamping without wrapping to adjacent lines, `j`/`k`
  clamping at buffer edges, and `k` at the first line leaving the prompt
  unchanged (no history navigation); verify with vitest
- [x] 2.3 Add the canary test asserting the real pi-tui `Editor` accepts the
  seam's structural write (write through the cast, read public
  `getCursor()`); verify it fails loudly if the cast shape is perturbed
  locally

## 3. Documentation and drift guards

- [x] 3.1 Update `docs/features.md` if it documents directional-motion wrap
  behavior; verify `npm run lint` and the docs-drift test pass
- [x] 3.2 Record the "verified private-state cursor seam" decision with
  `adrs new --tags cursor,adapter "Cursor sync via verified private-state
  seam"` covering rationale, alternatives, and the fallback contract; verify
  the ADR file exists and links the change

## 4. Integration checks

- [x] 4.1 Run `npm run check`, `npm test`, `npm run lint`, and
  `openspec validate fix-cursor-sync-drift --specs --strict`; verify all pass
  with the repros converted to plain passing tests

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Verify the archived result.
