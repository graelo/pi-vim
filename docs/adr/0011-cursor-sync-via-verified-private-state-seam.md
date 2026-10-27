---
number: 11
title: Cursor sync via verified private-state seam
date: 2026-10-27
status: accepted
tags:
- cursor
- adapter
---

# 11. Cursor sync via verified private-state seam

Date: 2026-10-27

## Status

Accepted

## Context

The modal engine computes motions and edits in logical prompt lines and
columns, but it owns no cursor: every keystroke reads the position from Pi's
base editor through `getCursor()`, and every edit applies where that position
says. The adapter therefore has to keep Pi's editor cursor in sync with
engine-intended positions.

Until now the adapter did that by replaying raw movement keys (`restoreCursor`
and the `adapterCommand` effects for `h`/`j`/`k`/`l`). Pi's `Editor`, however,
interprets those keys with different semantics: up/down move by *visual*
(word-wrapped) row, left/right move by grapheme and wrap across logical-line
boundaries, and up at the first visual line with column 0 triggers
prompt-history navigation. On any prompt whose lines wrap, the replayed keys
land the cursor on a different logical position than the engine intended, and
the next edit (`dd`, `x`, `D`, ...) hits a different line than the one under
the cursor. Pi exposes no public cursor setter (`getCursor()` is read-only),
which is why replay existed at all.

The drift is intermittent by construction (it depends on terminal width and
wrap points), which made it hard to reproduce. Five repros are captured in
`test/cursor-sync-regression.test.ts`.

## Decision

The adapter lands engine-intended cursor positions by writing Pi's private
editor cursor state directly (`state.cursorLine` plus a call to the
`setCursorCol` method, which maintains Pi's sticky-column invariants), and
verifies the write through the public `getCursor()`. The structural access is
factored into a single exported seam, `piCursorWriter` in `src/vim-editor.ts`,
whose writer returns success only when the read-back matches the target
exactly. On any detection failure, write error, or read-back mismatch,
`restoreCursor` falls back to the previous key-replay path.

Additionally, plain `h`/`j`/`k`/`l` (and arrow aliases) are computed in the
engine with logical-line semantics and clamping (`moveByPromptLines`, code
point-stepped `charForwardPosition`/`charBackwardPosition`) instead of
delegating raw keys. This removes the prompt-history hijack and cross-line
wrapping by construction and aligns plain motions with operator motions
(`dj`, `dk`), which were already engine-side.

A canary test pins the seam's structural assumption against the real pi-tui
`Editor`: if a future release renames or reshapes the internals, the canary
fails loudly in CI and points at the seam, while the runtime falls back to
replay - so the failure mode is the previous (drift-prone but understood)
behavior, never a silently diverged cursor.

This deliberately relaxes the adapter-architecture requirement that cursor
restoration uses only public Pi editor behavior: public movement behavior is
the source of the drift, and no public setter exists. The relaxation is
recorded in the `fix-cursor-sync-drift` OpenSpec change.

Alternatives considered:

- Pure key-replay with replicated wrap math (count visual rows using the
  exported `wordWrapLine`): rejected because it couples to behavioral
  internals - grapheme stepping, the history hijack, line-end jumps - which
  are precisely the moving target that caused the bug family.
- Asking upstream for a public `setCursor(line, col)` API: cleanest long-term,
  but not required; the seam is the single swap point if one appears.

## Consequences

Cursor positions always land exactly, so edits act on the line under the
cursor even in wrapped prompts. The adapter depends on pi-tui internals
(`state.cursorLine`, `setCursorCol`) that are declared `private` in the
shipped typings and therefore get no compile-time protection; the read-back
verification and the canary carry that risk. Both internals have been
byte-stable across pi-tui 0.99.2-1.4.0, and Pi pins pi-tui exactly, so the
tested combination matches what users run.

`j`/`k` clamp the column to each target line length (matching the existing
half-page motion semantics); Vim's goal-column memory through short lines is
a known deviation, accepted under the practical-prompt-editing product
boundary. Rejected chords and wrap-facing motions (`gj`/`gk`) remain out of
scope, as before.

Single-key relative delegations around insert-mode entry (`a`'s one-grapheme
`right`, `I`/`A`'s `lineStart`/`lineEnd`) stay native: they are exact and
semantically correct.
