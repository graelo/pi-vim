# Design

## Context

See `proposal.md` for the drift mechanism. Today `VimEditor.restoreCursor`
replays `KEY.up`/`KEY.down`/`KEY.left`/`KEY.right`/`lineStart`/`lineEnd`
escape sequences into Pi's base `Editor`, and `moveEffectFor` in
`src/modal/normal.ts` delegates plain `h`/`j`/`k`/`l` as raw
`adapterCommand` effects. Pi's `Editor` semantics differ from Vim's:

- up/down move across *visual* (word-wrapped) rows of `buildVisualLineMap`,
  jump to line end at the last visual row, and trigger prompt-history
  navigation when up is pressed at col 0 on the first visual row;
- left/right move by *grapheme* and wrap across logical-line boundaries;
- the wrap map uses `lastWidth`, which is only refreshed while Pi's base
  editor renders (insert-mode frames in pi-vim).

The modal engine computes everything else (word motions, `G`/`gg`,
operator motions like `dj`, half-page moves, edits) in logical lines and
columns against `snapshot.cursor`, and already has a logical-line helper
(`moveByPromptLines`, used by half-page motions).

Pi's `Editor` exposes no public cursor setter: `getCursor()` is read-only,
which is why replay exists. The relevant internals are `state.cursorLine`
and the `setCursorCol(col)` method (which also resets the sticky-column
fields `preferredVisualCol` and `snappedFromCursorCol`). Both are declared
`private` in the shipped `.d.ts`, and have been byte-stable across pi-tui
0.99.2–1.4.0.

## Goals / Non-Goals

Goals:

- Every engine-intended logical position lands exactly; deletes act on the
  line under the cursor even in wrapped prompts.
- A pi-tui internal change degrades to today's replay behavior, never to a
  silently diverged cursor, and fails the canary test loudly in CI.

Non-Goals:

- Vim goal-column memory for `j`/`k` through short lines (column clamps per
  line, matching the existing `moveByPromptLines` semantics used by half-page
  motions). Record as a known deviation; add only if users ask.
- Changing insert-mode native editing or arrow behavior outside normal and
  visual modes.
- Upstream changes to pi/pi-tui (e.g. a public `setCursor` API); the seam is
  the single swap point if one ever appears.

## Decisions

### D1: Verified direct write with replay fallback (adapter)

`restoreCursor` becomes a thin wrapper over a new private
`setBufferCursor(position): boolean`:

1. Clamp the target against current lines (existing `clampPosition`).
2. Access the base editor's `state.cursorLine` and `setCursorCol` through a
   narrow structural cast (same pattern as the existing `terminalRows()` /
   `terminalWrite()` TUI casts), feature-detect both.
3. Write `state.cursorLine`, then call `setCursorCol(col)` — the method, not
   a bare field write, so the sticky-column invariants stay with Pi's code.
4. Read back through the *public* `getCursor()`; return success only on an
   exact match.

On any detection failure, write error, or read-back mismatch, fall back to
the existing key-replay path (kept as `replayCursorKeys`).

Alternatives considered:

- *Pure key-replay with replicated wrap math*: compute visual-row deltas from
  the exported `wordWrapLine` and replay the right number of keys. Rejected:
  it couples to behavioral internals (grapheme stepping, history hijack,
  line-end jumps) that are the actual moving target, cannot express "land at
  exact col" without iterating, and still cannot suppress the history
  hijack cleanly.
- *Upstream `setCursor` API*: cleanest long-term, but blocked on upstream;
  the seam isolates the swap.

### D2: Engine-computed `h`/`j`/`k`/`l` (engine)

`moveEffectFor` stops emitting `adapterCommand` for `down`/`up`/`left`/
`right` and instead emits `restoreCursor` positions:

- `down`/`up`: `moveByPromptLines(text, cursor, ±count)` (existing helper:
  clamps line to buffer bounds, col to target line length).
- `left`/`right`: line-bounded code-point steps via new
  `charBackwardPosition`/`charForwardPosition` buffer helpers (built on the
  existing private `previousCodePointOffset`/`nextCodePointOffset`), so `l`
  steps over a multi-unit emoji as one character, matching the unit the
  codebase already uses for word motions and `x`.

This makes plain motions consistent with operator motions (`dj`, `dk`),
which are already engine-side, and removes the history hijack (`k` at top)
and cross-line wrap (`l` at end) by construction. `lineStart`/`lineEnd` stay
as `adapterCommand`: Pi's `moveToLineStart`/`moveToLineEnd` are exact
logical-line operations. The single-key `adapterCommand: right` emitted by
`a` (and `lineStart`/`lineEnd` for `I`/`A`) stays: one grapheme right is
exactly Vim's `a` semantics.

The `count > 1` adapter-command duplication in `moveUpdate` remains for
whatever adapter commands are left; the new `restoreCursor` positions absorb
counts directly.

### D3: Canary + regression tests

- Flip the five `test.fails` repros in `test/cursor-sync-drift-repro.test.ts`
  to regular tests (rename file to reflect regression coverage).
- Add a canary test that asserts the seam's structural assumption against the
  real pi-tui `Editor`: writing through the cast changes what public
  `getCursor()` returns. If pi-tui renames or reshapes the internals, the
  canary fails with a pointer at the seam.
- Add motion tests for clamping semantics (`h`/`l` never wrap, `j`/`k` clamp
  at buffer edges, `k` at top never touches history) in
  `test/modal/motions.test.ts` style.

## Risks / Trade-offs

- [pi-tui renames `state`/`setCursorCol`] → detection + read-back + fallback
  keeps runtime behavior at worst equal to today's; canary fails in CI at the
  devDependency bump that introduces the change.
- [pi-tui changes `setCursorCol` semantics (e.g. new invariant fields not
  reset by it)] → read-back still verifies the visible position; new
  sticky-column fields would only affect subsequent native insert-mode
  arrows, and canary/CI at bump time surfaces the drift.
- [Goal-column loss for `j`/`k` vs the native sticky column] → accepted,
  matches existing half-page semantics; documented deviation.
- [Half-written state if the write partially succeeds before failing] →
  replay is computed from the *current* public cursor each time, so the
  fallback self-corrects.

## Migration Plan

Single release; no config or data migration. Rollback is reverting the
commit; the replay path is preserved as fallback inside the same seam.

## Open Questions

None.
