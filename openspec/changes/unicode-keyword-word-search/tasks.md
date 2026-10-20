# Tasks

## 1. Unicode small-word buffer semantics

- [ ] 1.1 Replace the ASCII-only keyword classification in `src/buffer.ts` with one code-point-safe Unicode-aware classifier used by small-word motion, word text objects, operator ranges, insert word helpers, and word extraction; verify with focused `test/buffer.test.ts` coverage for `création`, punctuation, and unchanged `WORD` behavior.
- [ ] 1.2 Add focused buffer and configured insert-action regressions proving accented words remain contiguous for `w`/`b`/`e`/`ge`, operator and text-object ranges, and opt-in insert word movement/deletion while preserving register and cursor semantics.

## 2. Complete keyword-word search

- [ ] 2.1 Add a finite keyword-word search matcher and matching highlight-range support in `src/buffer.ts`; verify standalone accented matches are found, embedded matches such as `recréation` are excluded, and generic literal search still matches substrings.
- [ ] 2.2 Carry the keyword-word matcher through `src/modal/search.ts` search state, history, `n`/`N`, and highlight effects for `*`/`#` only; verify modal/search tests cover forward and backward repeat, safe missing-word behavior, and no changes to registers, visual state, or ordinary `/` and `?` behavior.

## 3. Documentation

- [ ] 3.1 Update `docs/features.md` and `docs/settings.md` to describe Unicode-aware small-word behavior and complete-match `*`/`#` behavior without claiming configurable `'iskeyword'` parity; verify documentation-drift tests cover the revised claims.

## 4. Integration validation

- [ ] 4.1 Run `npm test` and verify all focused and integration tests pass.
- [ ] 4.2 Run `npm run check`, `npm run lint`, and `npm run check:config-reference` and verify each succeeds.
- [ ] 4.3 Run `openspec validate unicode-keyword-word-search --strict` and `openspec validate --specs --strict` and verify the change and durable specifications validate.

## Workflow follow-up

- Archive the change after review and validation are complete.
