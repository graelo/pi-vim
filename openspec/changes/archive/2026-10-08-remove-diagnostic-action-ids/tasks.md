## 1. Runtime

- [x] 1.1 Delete `src/diagnostic-actions.ts`; drop its entries from
    `actionEntriesForKeymap`, `summarizeEntry`, and the `bindable` field in
    `src/customization.ts`; drop the fallback in `runtimeHelpMessage`
- [x] 1.2 Remove the `diagnostic-registry` source and the `bindable` flag
    from `src/config-metadata.ts` and `scripts/generate-config-reference.ts`;
    verify `npm run check:config-reference` reports no diff

## 2. Tests

- [x] 2.1 Delete `test/diagnostic-actions.test.ts` and the diagnostic
    metadata in `test/support/runtime-docs-metadata.ts` and
    `test/docs-drift.test.ts`
- [x] 2.2 Update the customization, runtime-help, modal, and config-metadata
    tests: `:keymap pi-vim.doctor` reports no match, `:help diagnostics`
    shows the runtime-help entry

## 3. Docs

- [x] 3.1 Remove the `diagnostic-actions:` anchors and `pi-vim.*` prose from
    `docs/features.md` and `docs/settings.md`; add a `Removed` entry to
    `CHANGELOG.md`

## 4. Validation

- [x] 4.1 `npm test`, `npm run check`, `npm run lint`,
    `npm run check:config-reference`
- [x] 4.2 `openspec validate remove-diagnostic-action-ids --strict` and
    `openspec validate --specs --strict`
