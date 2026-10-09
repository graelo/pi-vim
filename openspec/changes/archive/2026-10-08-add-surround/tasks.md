## 1. Pure surround helpers

- [x] 1.1 Export the bracket and quote finders from `src/buffer.ts` with an
    optional count for nested bracket pairs; verify with `test/buffer.test.ts`
    cases for nesting, multi-line pairs, and counts beyond the outermost pair
- [x] 1.2 Add `surroundRangeFor` in `src/buffer.ts` returning an offset range
    and linewise flag for a motion, text object, or character search, with
    trailing whitespace trimmed for charwise targets; verify with buffer tests
    for `w`, `iw`, `t,`, `j`, `ip`, and empty targets
- [x] 1.3 Create `src/surround.ts` with `surroundPairFor` and
    `surroundTargetFor`; verify every character class in the spec
    (opening, closing, aliases, quotes, punctuation, rejected) in a new
    `test/surround.test.ts`
- [x] 1.4 Add `addSurround` (charwise, linewise, `yss` line content),
    `deleteSurround`, and `changeSurround` returning `EditResult` with the
    cursor on the opening character; verify the spec examples, inner
    whitespace trimming, counts, quote and punctuation targets, and no-op on
    missing pairs in `test/surround.test.ts`

## 2. Types, descriptors, and config

- [x] 2.1 Add `surround` to `VimMotionOperatorAction` and
    `deleteSurround`, `changeSurround`, `surroundSelection` to the command
    actions in `src/types.ts` and `src/vim-config.d.ts`; verify with
    `npm run check` and `test/config-types.ts`
- [x] 2.2 Add the descriptors and defaults in `src/keymap-descriptors.ts`,
    the `operatorMotions.surround` default (copy of `yank`), and the scope
    rules in `src/mapping-scopes.ts`; verify with
    `test/keymap-descriptors.test.ts` and a config test that resolves the
    default keymap
- [x] 2.3 Implement the operator-extension exception in keymap compilation
    (`src/config.ts`); verify with config tests: defaults accepted, a command
    bound to `dw` rejected with a warning, `x`/`xy` still rejected, `gs` as
    surround accepted
- [x] 2.4 Regenerate `docs/config.md` with
    `npm run generate:config-reference`; verify with
    `npm run check:config-reference` and `test/config-metadata.test.ts`

## 3. Command resolution

- [x] 3.1 In `src/commands.ts`, resolve exact or longer-prefix bindings that
    extend a pending operator before operator targets; verify in
    `test/commands.test.ts` that `ys`, `ds`, `cs` resolve and `yiw`, `yy`,
    `dw`, `dd`, `ciw`, `cc` are unchanged
- [x] 3.2 Add the last-key line form for multi-key operators; verify `guu`,
    `gUU`, `g~~`, `yss`, `gss` (with `gs` configured), and that `gugu` and
    `dd` still work, in `test/commands.test.ts`
- [x] 3.3 Allow character-search targets for `surround` but not `/`, `?`,
    `;`, `,`, or marks; verify with resolver tests that `ysf,` and `yst,`
    resolve and `ys/` is invalid

## 4. Modal integration

- [x] 4.1 Add `pendingSurround` to `ModalState` and the surround
    `RepeatableChange` variants in `src/modal/types.ts`; carry them through
    `resetTransientState` where appropriate; verify with `npm run check`
- [x] 4.2 In `src/modal/normal.ts`, turn `surround` operator results and the
    `deleteSurround`/`changeSurround` commands into `pendingSurround`; verify
    in `test/modal.test.ts` that no edit happens before the character
- [x] 4.3 In `src/modal/engine.ts`, route keys to surround handling while
    `pendingSurround` is set: apply on a valid character, read the second
    character for `cs`, clear on Esc or a rejected key without inserting it;
    verify each spec scenario in `test/modal.test.ts`
- [x] 4.4 Record and replay repeats; verify `.` after `ysiw"`, `ds)`, and
    `cs"'`, and that registers (unnamed, named, pending named prefix) are
    untouched, in `test/modal.test.ts` (`.` takes no count here, like other
    repeats)
- [x] 4.5 Add visual `S` through `surroundSelection` in
    `src/modal/visual.ts`/`src/modal/engine.ts` for characterwise and
    linewise selections, no-op for block, return to normal mode, store
    `lastVisualSelection`, no repeat recorded; verify in
    `test/modal.test.ts`
- [x] 4.6 Show the typed keys in `pendingDisplay` while `pendingSurround` is
    set; verify in `test/modal.test.ts` or the view tests

## 5. Live editor

- [x] 5.1 Add `test/vim-editor.test.ts` cases for `ysiw)`, `yss"`, `ds(`,
    `cs])`, visual `S'`, single-step undo, `.` repeat, and a configured
    `gs` surround operator surviving `VimEditor` construction; verify with
    `npm test`
- [x] 5.2 Smoke-test in pi with `pi -ne -e ./src/index.ts`: the spec
    examples, `u`, `.`, and Esc while pending

## 6. Docs

- [x] 6.1 Add a surround section to `docs/features.md` (keys, pair rules,
    counts, repeat, non-goals) and the new keymap entries to
    `docs/settings.md`; verify with `test/docs-drift.test.ts`
- [x] 6.2 Check whether the drift guard requires runtime-help metadata; it
    does not, and a `:help surround` entry needs the archived spec path, so it
    moves to the workflow follow-up
- [x] 6.3 Add an "Added" entry to the 1.0.0 section of `CHANGELOG.md`
    covering surround and the `guu`/`gUU`/`g~~` line forms

## 7. Validation

- [x] 7.1 `npm test`, `npm run check`, `npm run lint`,
    `npm run check:config-reference`
- [x] 7.2 `openspec validate add-surround --strict` and
    `openspec validate --specs --strict`
- [x] 7.3 `npm run bench -- --runs=1 --warmup=0` shows no resolver
    regression beyond noise

## Workflow follow-up

- Archive with `/opsx-archive` after the user accepts the smoke test.
- After archive, add a `surround` entry to `src/runtime-help.ts` with a
  `<!-- runtime-help:surround -->` anchor in `docs/features.md` and
  `specAnchor: "openspec/specs/vim-surround/spec.md"`.
- Write a `docs/solutions/` entry if the operator-extension exception needed
  non-obvious fixes.
