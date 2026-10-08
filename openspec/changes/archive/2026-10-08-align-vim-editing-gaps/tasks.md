## 1. Insert escape

- [x] 1.1 Move the cursor left when leaving insert mode with Esc or an escape
    alias at a column above zero; verify in `test/modal.test.ts` and
    `test/vim-editor.test.ts` (`A` then Esc, `i` at column 0, `jk` alias)

## 2. Text objects

- [x] 2.1 Rework `iw`/`aw` on Vim word classes and add `iW`/`aW` (`bigWord`
    target in types, `vim-config.d.ts`, descriptors); verify in
    `test/buffer.test.ts` and `test/keymap-descriptors.test.ts`
- [x] 2.2 Add `quotePairRange` and use it for quote text objects (with
    `a"` blank handling) and surround char targets; verify cursor-on-quote,
    between strings, before the first string, and escaped quotes

## 3. Character search

- [x] 3.1 Make `F`/`T` operator ranges exclusive and allow an adjacent `t`
    target; update `test/buffer.test.ts` and the modal tests that encoded the
    old ranges

## 4. Register prefixes

- [x] 4.1 Keep parser pending state after a register prefix; verify
    `"adiw`, `"a2yy`, `"adt,`, `"a2x`, and that `"aj` still cancels

## 4b. Follow-ups

- [x] 4.2 Let commands that ignore registers run and consume the prefix;
    verify `"aj`, `"agUiw`, `"aq`, and visual `"ae`
- [x] 4.3 Add counted `p`/`P`, including the clipboard path; verify charwise,
    linewise, and named-register counts
- [x] 4.4 Add the `backtick` text-object target; verify buffer and modal
    `` di` `` / `` ca` ``

## 5. Docs and validation

- [x] 5.1 Update `docs/features.md`, `docs/settings.md`, regenerate
    `docs/config.md`, add `CHANGELOG.md` entries
- [x] 5.2 Amend the `add-surround` quote-pairing scenario
- [x] 5.3 `npm test`, `npm run check`, `npm run lint`,
    `npm run check:config-reference`, `openspec validate --strict`
