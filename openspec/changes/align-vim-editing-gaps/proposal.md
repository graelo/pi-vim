## Why

Several everyday edits behave differently from Vim, which breaks muscle memory
in exactly the places pi-vim claims to follow Vim. The project rule is that
non-Vim behavior is made Vim-like or removed; these are all worth keeping, so
they are made Vim-like.

## What Changes

- Leaving insert mode moves the cursor one character left, unless it is at
  the start of the line, as Vim does.
- `iw` and `aw` follow Vim word classes: a run of keyword characters, a run
  of other non-blank characters, or a run of blanks. On blanks, `iw` selects
  the blanks and `aw` the blanks plus the following word. New `iW` and `aW`
  text objects select whitespace-delimited WORDs (target `bigWord`, default
  `W`), which is what `iw` did before.
- Quote text objects follow Vim pairing: with the cursor on a quote, quotes
  pair up from the start of the line; otherwise the nearest quote before the
  cursor opens the string, or the first quoted string after the cursor is
  used when there is none before. Quotes escaped with a backslash are
  skipped. `a"` and `a'` include trailing blanks, or leading blanks when there
  are none trailing. Surround (`ds`, `cs`) uses the same pairing for quote and
  punctuation targets.
- Bracket text objects select the pair when the cursor is on its closing
  bracket, as `ds` and `cs` already do.
- `t` and `T` operator targets follow Vim: `dt,` with the comma right after
  the cursor deletes the character under the cursor, and `F` and `T` are
  exclusive, so `dF:` and `dT:` keep the character under the cursor.
- A register prefix no longer cancels counts, text objects, character
  searches, or multi-key operators that follow it, so `"adiw`, `"a2yy`,
  `"adt,`, and `"a2x` work.

Non-goals:

- Applying a register prefix to commands that do not use registers (`"aj`,
  `"agUiw`); they keep cancelling the prefix.
- Unicode letters as keyword characters; word classes stay ASCII, as for the
  `w` motion.
- Counted quote text objects (`2i"`) and the backtick text object.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-mode-editor`: cursor placement when leaving insert mode.
- `extended-vim-keybindings`: word, WORD, and quote text-object ranges;
  character-search operator ranges.
- `vim-named-registers`: register prefixes before counted and multi-key
  operator targets.
- `vim-keymap-configuration`: the `bigWord` text-object target.

The unarchived `add-surround` change is amended so its quote-pairing scenario
matches the text objects.

## Impact

- Code: `src/modal/engine.ts` (insert escape, register gate),
  `src/buffer.ts` (word, quote, and character-search ranges), `src/types.ts`,
  `src/vim-config.d.ts`, `src/keymap-descriptors.ts` (`bigWord`),
  `src/surround.ts`.
- Docs: `docs/features.md`, `docs/settings.md`, regenerated
  `docs/config.md`, `CHANGELOG.md`.
- Behavior change for users relying on the old `iw` (now `iW`) or on
  `dF`/`dT` including the cursor character.
