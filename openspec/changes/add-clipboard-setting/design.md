# Design

## Context

See [proposal.md](proposal.md). Register writes funnel through
`applyRegisterWrite` in `src/modal/registers.ts`, reached from about twenty
call sites through `editStateAndEffects`, `editState`, `yankUpdate`, and Ex
helpers. Several of those helpers receive no options, and `editState` drops
effects. Normal-mode paste chooses between prompt-local and host clipboard
reads in `pasteCommand` (`src/modal/normal.ts`) via `clipboardTargetToRead`.

## Goals / Non-Goals

**Goals:**

- One finite setting that makes the host clipboard the default for unprefixed
  register traffic, matching Vim's `'clipboard'` for the supported operations.
- Leave named, black-hole, and explicit clipboard targets unchanged.
- Keep linewise yanks linewise across a host clipboard round trip.

**Non-Goals:**

- Vim's full comma-separated `'clipboard'` grammar or `autoselect`.
- Host clipboard reads for visual-line paste or Ex `:put`.

## Decisions

### Mirror unnamed writes once, after routing, in `handleModalInput`

`mirrorUnnamedWrite` (registers seam) runs on every routed update in
`handleModalInput`, which already has the resolved plan options. When the
setting is enabled and the update replaced the unnamed register while the
incoming state had no register target (or an explicit `""`), and neither named
nor clipboard registers changed, it writes the clipboard mirror and appends one
`copyClipboard` effect. Named targets change `namedRegisters`, explicit
clipboard targets change `clipboardRegisters` and already copy, and black-hole
targets leave the unnamed register as it was, so all three are skipped. The
named/clipboard checks also cover Ex operands, which set the target during the
same input.

**Alternatives considered:** threading options through `applyRegisterWrite`
and every caller, which touches about twenty call sites in normal, visual,
search, surround, and Ex code for one setting, and loses effects through
`editState`. Seeding `pendingRegister` with the clipboard target before
routing changes prefix-dependent behavior (status display, register-pending
cancellation paths), so it is rejected too.

### Resolve the default paste target in `clipboardTargetToRead`

`clipboardTargetToRead(state, clipboard)` returns the configured clipboard slot
when no target or an explicit `""` is pending. `pasteCommand` keeps emitting the
existing `readClipboard` effect; the fallback is the clipboard mirror, then
the unnamed register for redirected pastes, so text yanked with a named
target or before enabling the setting still pastes when the host read fails.

### Keep the mirror type when host text matches it

`VimEditor.readClipboardAndPaste` reuses the fallback register when the host
text equals its text. OS clipboard text carries no linewise flag; equality with
the prompt's own last copy is the cheap signal Vim itself approximates by owning
the selection. Other text still pastes charwise.

## Risks / Trade-offs

- The mirror check uses state identity (the unnamed register object changed)
  rather than an explicit write record. Register writes always allocate a new
  register object, and modal tests cover yank, delete, change, visual, Ex, and
  non-writing edits, so a future write path that reuses objects would surface
  there.
- Every unprefixed yank/delete now copies to the host clipboard when the setting
  is enabled, including `x` and `dd` used for cleanup. That matches Vim's
  behavior with `unnamedplus`; users who want a quiet delete use `"_`.

## Migration Plan

- None. The default `"none"` keeps existing behavior.

## Open Questions

- None.
