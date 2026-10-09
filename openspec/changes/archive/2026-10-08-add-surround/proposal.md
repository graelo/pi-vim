## Why

Adding, deleting, and changing quotes or brackets around text is one of the
most common prompt edits, and pi-vim has no way to do it short of retyping both
ends. Vim users get it from vim-surround (tpope), so `ys`, `ds`, `cs`, and
visual `S` are the expected keys. ADR-0006 already placed surround in the
operator grammar rather than in a separate action layer.

## What Changes

- New `ys{motion}{char}` and `ys{text-object}{char}` operator that wraps the
  addressed text, including character-search targets (`ysf,)`), with a line
  form `yss{char}` that wraps the line content after its indentation.
- New `ds{char}` that deletes the nearest surrounding pair, and
  `cs{old}{new}` that replaces it.
- New visual `S{char}` that wraps a characterwise or linewise selection.
- Pair characters follow vim-surround: `(` `{` `[` add inner spaces, `)` `}`
  `]` `>` do not, `b` `B` `r` `a` alias the closing forms, quotes and other
  punctuation wrap with the same character on both sides. Deleting or changing
  with an opening character also trims whitespace inside the pair.
- Counts, `.` repeat, single-step undo, and Esc cancellation behave as in Vim;
  surround never writes registers.
- All four entry points are semantic actions with keymap descriptors, so they
  can be rebound or unbound through `piVim.keymap`.
- Bindings may extend a bound operator sequence (`ys` after `y`, `ds` after
  `d`, `cs` after `c`) without a strict-prefix conflict, as long as the
  remaining keys are not themselves a target of that operator.
- Multi-key operators gain Vim's last-key line form, so `guu`, `gUU`, and
  `g~~` work alongside `gugu`, `gUgU`, and `g~g~`, and `yss` follows the same
  rule.

Non-goals:

- HTML/XML tags: `t` and `<` as surround characters, `dst`, and `cst`.
- vim-surround's newline variants `yS`, `ySS`, `gS`, and insert-mode
  `<C-g>s`.
- Function-call surrounds (`f`, `F`) and custom surround definitions.
- Visual block surround, which stays a safe no-op.
- Reindenting lines wrapped by linewise surrounds.

## Capabilities

### New Capabilities

- `vim-surround`: adding, deleting, and changing surrounding pairs in normal
  and visual modes, pair-character rules, counts, repeat, undo, and safe
  no-op behavior.

### Modified Capabilities

- `vim-keymap-configuration`: surround actions and their defaults, the
  operator-extension exception to strict-prefix conflicts, and the last-key
  line form for multi-key operators.

## Impact

- Code: `src/types.ts` and `src/vim-config.d.ts` (operator and command
  actions), `src/keymap-descriptors.ts`, `src/mapping-scopes.ts`,
  `src/config.ts` (prefix-conflict exception), `src/commands.ts` (operator
  extension and line-form resolution), a new pure `src/surround.ts` helper
  that reuses delimiter finders from `src/buffer.ts`, `src/modal/` (pending
  surround state, normal and visual dispatch, repeat), `src/modal/view.ts`
  (pending display), and `src/config-metadata.ts`.
- Tests: buffer-level surround tests, command resolver tests, modal and live
  `VimEditor` tests, config conflict tests.
- Docs: `docs/features.md`, `docs/settings.md`, generated blocks in
  `docs/config.md`, `CHANGELOG.md`.
- Settings: new keys under existing families (`keymap.operators.surround`,
  `keymap.operatorMotions.surround`, `keymap.commands.deleteSurround`,
  `keymap.commands.changeSurround`, `keymap.commands.surroundSelection`); no
  new option family.
- Compatibility: additive. `guu`, `gUU`, and `g~~` previously did nothing.
  No new runtime dependencies.
