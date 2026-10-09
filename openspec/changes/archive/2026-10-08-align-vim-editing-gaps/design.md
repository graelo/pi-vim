## Context

The modal engine leaves insert mode through `modeUpdate` without moving the
cursor. Text-object ranges live in `src/buffer.ts` (`wordRangeAtOffset`,
`quoteRangeAtOffset`); surround has a separate `enclosingCharRange` with
line-start pairing. Character-search operator ranges are built in
`charSearchOperatorOffsetRange`. The register prefix gate in
`applyNormalPendingResolution` drops any parser pending state that is not a
bare operator sequence.

## Decisions

### 1. Insert escape uses the adapter's left move

On Esc or a configured escape alias in insert mode, with the cursor column
above zero, the transition adds an `adapterCommand: "left"` effect. Pi's
editor moves by grapheme, so a combining sequence or emoji is not split.
Block insert and the autocomplete path are unchanged.

### 2. One quote-pairing helper

Replace `quoteRangeAtOffset` and `enclosingCharRange` with one exported
`quotePairRange(text, cursor, char)` implementing Vim's rules (cursor on the
character: pair from line start; otherwise previous occurrence to next one;
none before: first pair after the cursor; backslash-escaped occurrences
skipped). Quote text objects and surround `char` targets both use it.

### 3. Word classes shared with motions

`iw`/`aw` reuse `boundaryKind("small", …)` and `iW`/`aW` reuse
`boundaryKind("big", …)`, so text objects and `w`/`W` agree on classes.
Runs stop at line ends.

### 4. Register gate keeps parser pending state

With a register prefix set, a `pending` result is kept whenever the parser
is still inside a count or an operator target. Register use is decided when
the command or operator resolves, as today.

## Risks / Trade-offs

- [Users relying on `iw` crossing punctuation] → `iW` gives the old range;
  the changelog says so.
- [Cursor move on escape can affect macros or `.` replays that feed Esc] →
  matches Vim, which also moves left there; tests cover `.` after an insert.
