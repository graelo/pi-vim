# Tasks

## 1. Decoding (`src/modal/core.ts`)

- [x] 1.1 Add the Shift+letter helper (D1) and try it first in `keySequence`
  and `insertKeySequence`. Verify with decoder tests covering every row of the
  design table, plus `shift+1`, `ctrl+shift+x` and an unshifted Kitty letter.

## 2. Modal behavior

- [x] 2.1 Verify with modal tests that `X` deletes backward for
  `CSI 120;2u`, `CSI 27;2;88~` and `CSI 27;2;120~`, and that `f` followed by
  `CSI 120;2u` targets `X`.

## 3. Config warning

- [x] 3.1 Add `shiftedLetterToken` (D3) and reject `shift+<letter>` bindings
  with a warning in `parseStringArray` and `compileMapping`. Verify with
  `test/config.test.ts` (`<S-x>`, raw `shift+X`, a multi-key sequence, an
  insert binding, a surviving sibling) and `test/config-js.test.ts`.

- [x] 3.2 Replay a `shift+<letter>` string-remap token as the uppercase
  letter (D4). Verify with a `test/config-js.test.ts` case for
  `"<S-x><S-tab>x"`.

## 4. Docs

- [x] 4.1 Add a CHANGELOG `[Unreleased]` entry under Fixed, and a `docs/solutions`
    entry for the Shift+letter decoding pitfall, and document the
    uppercase-letter rule in the `docs/settings.md` key syntax rules. Verify
    that `npm run lint` passes.

## 5. Validation

- [x] 5.1 Run `npm test`, `npm run check`, `npm run lint`,
  `npm run check:config-reference` and `openspec validate --specs --strict`,
  and verify that all pass.
- [ ] 5.2 Smoke-test in pi under tmux and in a Kitty-protocol terminal: run
  `pi -e ./src/index.ts`, type `abcd`, press Escape, then `X`, and check that
  `c` (the char before the cursor) is deleted.

## Workflow follow-up

- Archive with `/opsx-archive` once the user accepts the change.
