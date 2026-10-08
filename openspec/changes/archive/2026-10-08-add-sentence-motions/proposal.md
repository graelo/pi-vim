## Why

Prompts are mostly prose, and Vim's sentence motions are the natural way to
move through and edit prose one sentence at a time. pi-vim has paragraph
motions (`{`, `}`) and objects (`ip`, `ap`) but no sentence equivalents, and
`docs/features.md` lists sentence motions as missing.

## What Changes

- `)` moves to the start of the next sentence; `(` moves to the start of the
  current sentence, or the previous one when already there. Both take counts
  and work in normal and visual modes.
- `(` and `)` work after motion-capable operators (`d)`, `c(`, `y)`, the case
  operators, and `ys`) as exclusive characterwise motions, with `.` repeat for
  changes.
- `is` and `as` sentence text objects: `is` selects the sentence (or the
  blank run between sentences); `as` adds trailing blanks, or leading blanks
  when there are none trailing.
- Sentence boundaries follow `:help sentence`: `.`, `!`, or `?`, optionally
  followed by `)`, `]`, `"`, or `'`, then a space, tab, or end of line. Blank
  lines (paragraph boundaries) also end a sentence.
- New keymap entries: `piVim.keymap.motions.sentenceBackward` (`(`),
  `piVim.keymap.motions.sentenceForward` (`)`), and text-object target
  `sentence` (`s`). Both motions join the default operator-motion matrix.
- `:help motions` and the text-object docs cover sentences.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `extended-vim-keybindings`: sentence motions, operator sentence motions,
  and sentence text objects.
- `prompt-buffer-operations`: pure sentence navigation and sentence operator
  ranges.
- `vim-keymap-configuration`: sentence motions and the `sentence` target are
  configurable semantic actions.

## Impact

- Code: `src/buffer.ts` (sentence scanning, motion ranges, text objects),
  `src/types.ts` and `src/vim-config.d.ts` (motion and target unions),
  `src/keymap-descriptors.ts`, `src/customization.ts`, `src/modal/normal.ts`
  (motion dispatch), `src/runtime-help.ts`.
- Docs: `docs/features.md`, `docs/settings.md`, regenerated `docs/config.md`.
- Tests: `test/buffer.test.ts`, `test/commands.test.ts`,
  `test/keymap-descriptors.test.ts`, modal tests, docs drift.
- Compatibility: additive. `(` and `)` are unbound in normal mode today, and
  `s` is not a text-object target, so no existing binding changes. No new
  runtime dependencies.

## Non-goals

- Visual-mode text objects (`vis`, `vas`): visual mode has no text objects
  today.
- Counted sentence objects (`d2as`), matching other text objects.
- Vim's `cpoptions` `J` flag (two spaces after a sentence end) and nroff
  section macros.
- Vim's exclusive-to-linewise adjustment when an operator motion ends at
  column 0; operator ranges stay characterwise, as with `{` and `}`.
