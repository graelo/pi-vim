# Tasks

## 1. Types, defaults and parsing (`src/types.ts`, `src/config/`)

- [x] 1.1 Add `VimModeColor` and `VimModeColors`, and add `colors` to
  `ResolvedVimUi["mode"]` and the partial UI option types, with default `{}`
  in `src/config/defaults.ts`. Verify that `npm run check` passes.
- [x] 1.2 Parse `ui.mode.colors` in `src/config/ui-parsers.ts` per D5:
  palette integers `0`–`255`, `#rrggbb` lowercased, and field-local warnings.
  Verify with `test/config.test.ts` cases for:
  - valid index and hex colors;
  - a non-object `colors` value;
  - an unknown mode;
  - a non-object entry;
  - out-of-range, fractional and malformed hex colors;
  - a valid sibling surviving an invalid neighbor.
- [x] 1.3 Merge per mode across JSON layers in `src/config/merge.ts`, and
  deep-copy in `src/config/clone.ts`. Verify with a `test/config.test.ts`
  case where the project sets `insert` and keeps the global `normal`, and an
  isolation case where mutating the resolved colors leaves the input
  untouched.

## 2. Trusted JS path

- [x] 2.1 Add `ui.mode.colors` to `TRUSTED_JS_OPTION_PATHS`, `PROPERTY_FACTS`
  and `JS_REPLACED_RECORD_PATHS`. Verify with a `test/config-js.test.ts` case
  where `vim.ui.mode.colors` replaces the global record, and with
  `test/config-metadata.test.ts`.

## 3. View and rendering (`src/modal/view.ts`)

- [x] 3.1 Add the pure SGR helper (D2) and wrap the mode label in
  `statusPartsForItem` (D3), including the visual fallback. Verify with view
  tests for:
  - an index color;
  - a hex color;
  - `bg` only;
  - an empty entry rendering plain;
  - the narrow label;
  - `visualLine` inheriting `visual`, and its own entry winning;
  - no colors configured (output byte-identical to today).
- [x] 3.2 Verify width safety with a live `VimEditor` test in
  `test/vim-editor.test.ts`:
  - a colored label at several narrow widths stays within the width;
  - the line ends the color before the border dashes;
  - `reconfigure` with new colors changes the rendered label.

## 4. Docs

- [x] 4.1 Document `ui.mode.colors` in `docs/settings.md`: the table rows,
  accepted values, the visual fallback, and a Solarized-index example. Add a
  short mention in the `docs/features.md` status UI section. Verify that
  `test/docs-drift.test.ts` passes.
- [x] 4.2 Regenerate `docs/config.md` with
  `npm run generate:config-reference`, and verify with
  `npm run check:config-reference`.
- [x] 4.3 Add a CHANGELOG `[Unreleased]` entry under Added. Verify that
  `npm run lint` passes.

## 5. Validation

- [x] 5.1 Run `npm test`, `npm run check`, `npm run lint`,
  `npm run check:config-reference` and `openspec validate --specs --strict`,
  and verify that all pass.
- [x] 5.2 Smoke-test in pi: add the Solarized example to
  `~/.pi/agent/extensions/pi-vim/config.json`, run `pi -e ./src/index.ts`, and
  check that the normal, insert and visual labels show their colored blocks
  and `:vimdoctor` reports no warnings.

## Workflow follow-up

- Archive with `/opsx-archive` once the user accepts the change.
