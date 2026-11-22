# Tasks

## 1. Setting

- [x] 1.1 Add `clipboard` (`"none"`, `"unnamed"`, `"unnamedplus"`, default
    `"none"`) to option types, defaults, JSON parsing with a warning for
    invalid values, merge, clone, trusted JS paths, config metadata, and
    `vim-config.d.ts`; verify config, trusted JS, metadata, and type fixture
    tests.

## 2. Register behavior

- [x] 2.1 Mirror unnamed-register writes to the configured clipboard register
    with one host copy request in `handleModalInput`; verify modal tests for
    yank, delete, change, visual, explicit `""`, Ex operands, named,
    black-hole, explicit clipboard, and non-writing edits.
- [x] 2.2 Route unprefixed normal-mode paste through the host clipboard read
    with mirror then unnamed fallback; verify modal paste tests.
- [x] 2.3 Keep the mirror register type when host text equals it; verify live
    editor tests for explicit `"+` and the setting, and live `reconfigure`.

## 3. Documentation

- [x] 3.1 Document the setting in `docs/settings.md` and `docs/features.md`,
    regenerate `docs/config.md`, and update the runtime help summary.

## 4. Integration validation

- [x] 4.1 Run `npm test`, `npm run check`, `npm run lint`, and
    `npm run check:config-reference`.
- [x] 4.2 Run `openspec validate add-clipboard-setting --strict` and
    `openspec validate --specs --strict`.

## Workflow follow-up

- Archive the change after review and validation are complete.
