## 1. Runtime help

- [x] 1.1 Add a `surround` entry to `src/runtime-help.ts` with
    `specAnchor: "openspec/specs/vim-surround/spec.md"` and the
    `runtime-help:surround` anchor in `docs/features.md`; verify in
    `test/runtime-help.test.ts` and `test/docs-drift.test.ts`

## 2. Validation

- [x] 2.1 `npm test`, `npm run check`, `npm run lint`,
    `openspec validate add-surround-help --strict`
