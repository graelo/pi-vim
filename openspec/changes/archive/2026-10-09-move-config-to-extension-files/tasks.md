# Tasks

## 1. Dependency

- [x] 1.1 Add `@graelo/pi-ext-config@^0.2.0` to `dependencies` with
  `npm install`, and verify that `npm run check` resolves its import

## 2. Loader and paths (`src/config.ts`, `src/config-js.ts`)

- [x] 2.1 Make the JS config path derive from the agent dir: rename
  `JS_CONFIG_FILE_NAME` to `config.js` under `extensions/pi-vim`, use
  `getAgentDir()` by default, and accept an `agentDir` override. Verify with
  `test/config-js.test.ts` cases for the default path and for the override.
- [x] 2.2 Replace the settings-file reads with two `loadConfig("pi-vim", …)`
  calls (D1):
  - global only;
  - project when `isProjectTrusted`, accepted only when the source is the
    project candidate;
  - diagnostics de-duplicated.

    Verify with `test/config.test.ts` cases for each of these:
  - global only;
  - trusted project;
  - untrusted project ignored;
  - no git repository;
  - malformed project file (warns and falls back to global);
  - a malformed global file reported once;
  - `PI_CODING_AGENT_DIR`/`agentDir` honored.
- [x] 2.3 Parse the root object of each file instead of its `piVim` member,
  and stop reading `settings.json`. Verify that a fixture `settings.json`
  holding a `piVim` key changes nothing and produces no warning.
- [x] 2.4 Delete `defaultVimConfigPaths`, `warnRenamedSettingsKey`,
  `renamedJsConfigWarnings` and their tests, and update the
  `VimConfigPaths` type (D2). Verify that `npm run check` passes.
- [x] 2.5 Drop the `piVim.` prefix from warning paths and switch the source
  labels to `global config`, `global JS config` and `project config`. Update
  the asserted warning texts in `test/config.test.ts` and
  `test/config-js.test.ts`, and verify that the suites pass.
- [x] 2.6 Verify that layering is unchanged: the existing preset, project
  exact-precedence, JS-append and leader tests in `test/config.test.ts` pass
  with only labels and fixtures changed.

## 3. Lifecycle (`src/lifecycle.ts`)

- [x] 3.1 Pass `isProjectTrusted: ctx.isProjectTrusted()` with `cwd` to the
  loader. Verify with a `test/lifecycle.test.ts` case asserting the loader
  receives both values, and one where a later install after a trust change
  receives `true`.

## 4. Path strings outside the loader

- [x] 4.1 Drop the `piVim.` prefix in `src/config-metadata.ts`,
  `src/customization.ts`, `src/runtime-help.ts` and
  `scripts/generate-config-reference.ts`. Verify that
  `test/config-metadata.test.ts`, `test/generate-config-reference.test.ts`
  and `test/vim-editor.test.ts` pass, and that
  `git grep -n "piVim\\." src scripts` returns nothing.

## 5. Docs

- [x] 5.1 Rewrite "Settings files and precedence" and the "Global JS config"
  location in `docs/settings.md` (D5), and unwrap every JSON example. Verify
  that `test/docs-drift.test.ts` passes after updating its settings-path
  pattern, and that `test/trusted-config-examples.test.ts` passes.
- [x] 5.2 Regenerate `docs/config.md` with
  `npm run generate:config-reference`, and verify with
  `npm run check:config-reference`.
- [x] 5.3 Update the config paths in `README.md` and `docs/features.md`.
  Verify that `git grep -nE "piVim\b|settings\.json|pi-vim\.config\.js"
  README.md docs/settings.md docs/features.md docs/config.md` returns only
  intentional mentions.
- [x] 5.4 Add an ADR with `adrs new --tags config --link "8:Amends:Amended by"
  "Store pi-vim config in extension config files"`. Verify that the ADR file
  exists and that ADR-0008 shows the reverse link.
- [x] 5.5 Add a CHANGELOG `[Unreleased]` entry with the migration steps from
  design.md. Verify that `npm run lint` passes.

## 6. Validation

- [x] 6.1 Run `npm test`, `npm run check`, `npm run lint`,
  `npm run check:config-reference` and `openspec validate --specs --strict`,
  and verify that all pass.
- [x] 6.2 Smoke-test in pi:
  - create `<agent-dir>/extensions/pi-vim/config.json` containing
    `{ "startMode": "normal" }`;
  - run `pi -e ./src/index.ts`;
  - check that the prompt starts in normal mode and that `:vimdoctor` shows no
    warnings.

    `~/.pi/agent/settings.json` must not be touched.

## Workflow follow-up

- Archive with `/opsx-archive` once the user accepts the change.
- Then split `src/config.ts` into `src/config/` modules (item 2b of the
  refactoring note).
