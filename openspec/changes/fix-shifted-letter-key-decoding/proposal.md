# Proposal

## Why

Uppercase normal-mode keys such as `X`, `A`, `O`, `G` or `P` misbehave in
some terminals. pi-vim decodes keys through pi-tui, and two terminal encodings
of Shift+letter lose the uppercase character:

- Kitty CSI-u without the shifted-key field (`CSI 120;2u`) decodes as `x`, so
  `X` deletes the character under the cursor instead of the one before it.
- xterm modifyOtherKeys (`CSI 27;2;88~`), which pi enables when the Kitty
  protocol is not negotiated (for example under tmux), decodes as `shift+x`,
  which matches no binding, so `X` does nothing.

The modal engine already implements `X` correctly; only key decoding is wrong.

## What Changes

- Key decoding maps any input that pi-tui parses as `shift+<letter>` to the
  uppercase letter, in every modal state that reads printable keys (normal,
  visual, operator-pending, pending character targets, search, Ex command
  line, insert-mode mappings).
- Plain `X` and Kitty events that carry the shifted key keep decoding as
  today.

## Non-goals

- Shifted non-letters (`shift+1`), whose character depends on the keyboard
  layout.
- Caps Lock without Shift.
- Changes to how keymap bindings are configured or validated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-keymap-configuration`: adds a requirement that Shift+letter input
  resolves to the uppercase key across terminal encodings.

## Impact

- **Code:** `src/modal/core.ts` (`keySequence`, `insertKeySequence`).
- **Tests:** decoder unit tests and modal tests that send each encoding of
  Shift+x.
- **Docs:** CHANGELOG `[Unreleased]` entry under Fixed; a `docs/solutions`
  entry.
- **Dependencies:** none.
- **Compatibility:** a binding written as `shift+<letter>` no longer fires,
  because the input now resolves to the uppercase letter; bind the uppercase
  letter instead, as in Vim.
