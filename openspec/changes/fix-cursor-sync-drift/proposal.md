# Proposal

## Why

Cursor movements and edits can land on the wrong logical line of a wrapped
multi-line prompt: after moving, a delete (`dd`, `x`, `D`, ...) affects a
different line than the one under the cursor. The modal engine computes
motions in logical lines and columns, but the adapter keeps Pi's base editor
in sync by replaying raw arrow-key sequences. Pi's `Editor` interprets those
keys as *visual* (word-wrapped) row moves, moves left/right by grapheme and
wraps across logical-line boundaries, and hijacks up-arrow at the top visual
line as prompt-history navigation. The two models diverge on any prompt whose
lines wrap, which makes the bug intermittent and machine-dependent. Five
failing repros are captured in `test/cursor-sync-drift-repro.test.ts`.

## What Changes

- Add a verified cursor-position seam to the `VimEditor` adapter: write the
  logical cursor position (`cursorLine`/`setCursorCol`) directly, then verify
  through the public `getCursor()`; on any mismatch, fall back to the existing
  arrow-key replay.
- Route cursor restoration (`restoreCursor`) through that seam so every
  engine motion, edit, mark, search, and easymotion target lands exactly on
  the engine's logical position.
- Compute plain `h`/`j`/`k`/`l` (and their arrow-key aliases) in the modal
  engine using logical-line/column semantics with Vim clamping, instead of
  delegating raw keys to Pi's editor. `j`/`k` use the existing
  `moveByPromptLines` helper; `h`/`l` clamp at line boundaries without
  wrapping to adjacent lines.
- Keep single-key relative delegations used around insert-mode entry
  (`a`, `I`, `A`) and `0`/`$` unchanged; they are exact and safe.
- Flip the five `test.fails` drift repros into passing regression tests and
  add a canary test that fails loudly if the seam's private-state assumptions
  drift in a future pi-tui release.

This deliberately relaxes the adapter requirement that cursor restoration
uses only public Pi editor behavior: public movement behavior is the source
of the drift, and Pi exposes no public cursor setter (`getCursor()` is
read-only). The seam reads the position back through the public API, so the
fallback guarantees the failure mode is never worse than the current replay
behavior.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `vim-editor-adapter-architecture`: the "Adapter applies modal effects with
  public Pi APIs" requirement gains a verified private-state cursor seam with
  a public-API read-back and replay fallback; the previous unconditional
  arrow-key replay is the documented fallback.
- `vim-mode-editor`: the "Normal mode supports core Vim navigation"
  requirement now specifies logical-line/column semantics for `h`/`j`/`k`/`l`
  and arrow aliases, including wrapped lines and line-boundary clamping
  (`l` and `h` never wrap to adjacent lines; `k`/`j` clamp at buffer
  boundaries and never trigger prompt-history navigation or line-end jumps).

## Impact

- `src/vim-editor.ts`: new `setBufferCursor` seam with verification and
  fallback; `restoreCursor` routes through it.
- `src/modal/normal.ts`: `moveEffectFor` computes `down`/`up`/`left`/`right`
  positions engine-side (`moveByPromptLines` and bounded column moves) and
  emits `restoreCursor` effects instead of `adapterCommand` effects.
- `src/buffer.ts`: no change expected (`moveByPromptLines` already exists);
  possibly a small bounded `moveByColumns` helper.
- Tests: `test/cursor-sync-drift-repro.test.ts` (flip `test.fails`),
  new canary test, motion tests for clamping and wrapped lines.
- Docs: `docs/features.md` only if it currently documents delegated
  arrow/wrap behavior for these motions.
- ADR: record the "verified private-state cursor seam" decision.
- Dependencies: none new; relies on pi-tui `Editor` internals
  (`state.cursorLine`, `setCursorCol`) that have been byte-stable across
  0.99.2–1.4.0 and are guarded by read-back verification.
