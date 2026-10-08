## 1. Sentence scanner and motions in the buffer

- [ ] 1.1 Add the sentence-start scanner and `sentenceForwardPosition` /
    `sentenceBackwardPosition` to `src/buffer.ts`; verify in
    `test/buffer.test.ts` with terminators, closers (`."`, `.)`), `v1.2`,
    multi-line sentences, blank-line stops, counts, clamping, and empty or
    blank prompts
- [ ] 1.2 Add the `(`/`)` branch to `motionOffsetRange` (exclusive
    characterwise); verify `deleteByMotion`/`yankByMotion` tests for `d)`,
    `d(`, counted `d2)`, and the no-op at prompt end

## 2. Sentence text objects in the buffer

- [ ] 2.1 Add `sentence` to `VimTextObjectTarget` and sentence range
    resolution next to the `paragraph` cases (base range, yank, delete,
    case transform, `isPromptStructureTarget` exclusion); verify in
    `test/buffer.test.ts`: `is`/`as` mid-sentence, on the blank run between
    sentences, the leading-blank fallback at paragraph end, and no range on
    blank lines

## 3. Types, keymap, and config

- [ ] 3.1 Add `sentenceBackward` / `sentenceForward` to `VimMotionAction`,
    `VimMotion` (`(`, `)`), `src/vim-config.d.ts`, the motion descriptors,
    and `src/customization.ts`; add the `sentence` target descriptor
    (default `s`); verify in `test/keymap-descriptors.test.ts` and
    `test/commands.test.ts` (default keys, `d)`, `dis`, configured keys,
    omitted operator motion clears pending state, `ds(` and `cs"'` still
    parse as surround)
- [ ] 3.2 Regenerate `docs/config.md` with
    `npm run generate:config-reference`, update the motion, target, and
    operator-motion rows in `docs/settings.md`; verify
    `npm run check:config-reference` and `test/docs-drift.test.ts`

## 4. Modal integration

- [ ] 4.1 Dispatch the sentence motions in `src/modal/normal.ts`; verify in
    the modal tests: `)`/`(` in normal mode, counts, visual char/line/block
    extension with an unchanged anchor, `c(` entering insert mode, register
    prefix (`"ad)`), and `.` repeat of `das` and `d)`
- [ ] 4.2 Add a live `VimEditor` test with a configured `sentenceForward`
    key to confirm config reaches the editor

## 5. Help and docs

- [ ] 5.1 Add `sentence`, `(`, `)` topics to the `motions` entry in
    `src/runtime-help.ts`; verify `:help sentence` in
    `test/runtime-help.test.ts`
- [ ] 5.2 Document `(`/`)` in the motion table and paragraph notes, `is`/`as`
    in the text-object table with the boundary rules and limits, in
    `docs/features.md`; drop "sentence motions" from the missing-features
    note and fix the stale "Word objects use whitespace boundaries" limit;
    add a `[Unreleased]` entry to `CHANGELOG.md`; verify `npm run lint`

## 6. Validation

- [ ] 6.1 `npm test`, `npm run check`, `npm run lint`,
    `npm run check:config-reference`,
    `openspec validate add-sentence-motions --strict`

## Workflow follow-up

- Smoke-test in pi with `pi -e ./src/index.ts`, then archive after user
  acceptance.
