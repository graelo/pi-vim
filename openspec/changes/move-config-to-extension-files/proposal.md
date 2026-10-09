# Proposal

## Why

pi-vim reads its options from a `piVim` key inside Pi's own `settings.json`
files and its trusted JS config from `~/.pi/agent/pi-vim.config.js`. The
maintainer's other pi extensions keep their config in dedicated files located
by `@graelo/pi-ext-config`. Moving pi-vim to the same layout makes it
consistent with them. It also fixes two current problems:

- the global path is built from `homedir()`, so it ignores
  `PI_CODING_AGENT_DIR`;
- project settings are read even when Pi has not trusted the project.

Nothing has been released under the pi-vim name yet, so the old locations
can be dropped without a migration path.

## What Changes

- **BREAKING** Global options move from the `piVim` key of
  `~/.pi/agent/settings.json` to `<agent-dir>/extensions/pi-vim/config.json`.
  `<agent-dir>` is Pi's `getAgentDir()`, which honors `PI_CODING_AGENT_DIR`.
- **BREAKING** Project options move from the `piVim` key of
  `<cwd>/.pi/settings.json` to `<repo-root>/.pi/extensions/pi-vim/config.json`.
  `<repo-root>` is the nearest enclosing git repository. Outside a repository
  there is no project tier.
- **BREAKING** The project tier is read only when Pi reports the project as
  trusted (`ctx.isProjectTrusted()`).
- **BREAKING** Each `config.json` holds the options object directly, with no
  `piVim` wrapper key. Option paths in warnings, docs and specs drop the
  `piVim.` prefix: `piVim.ui.status.enabled` becomes `ui.status.enabled`.
- **BREAKING** The trusted JS config moves from `~/.pi/agent/pi-vim.config.js`
  to `<agent-dir>/extensions/pi-vim/config.js`. It stays global-only.
- Warning source labels become `global config`, `global JS config` and
  `project config`, replacing `global settings` and `project settings`.
- **BREAKING** pi-vim stops reading Pi's `settings.json` files altogether. A
  leftover `piVim` key there is ignored silently.
- The pre-rename warnings for `piVimMode` and `pi-vimmode.config.js` are
  removed. They only fire from the old locations, which pi-vim no longer reads.
- Layering is unchanged. The order is global JSON, then JS config, then
  project JSON, with the same per-field merge, preset handling, project
  exact-mapping precedence and final leader resolution.
  `@graelo/pi-ext-config` only locates and reads the files; pi-vim keeps its
  own merge.

## Non-goals

- No change to option names below the old `piVim` root, defaults, validation
  or keymap semantics.
- No project-level JS config.
- No automatic migration or warning for the old `settings.json` key.
- Splitting `src/config.ts` into modules is a separate, behavior-preserving
  follow-up.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-mode-visual-configuration`: "Settings are namespaced and read-only"
  now names the dedicated config files, the project trust gate and the
  git-root project location.
- `vim-keymap-configuration`: the trusted JS config location changes, and
  option paths drop the `piVim.` prefix throughout.
- `vim-customization-diagnostics`: the pre-rename warning requirement is
  removed; option paths and source labels in warning texts change.
- `vim-extension-lifecycle`: the settings load receives the project trust
  decision along with `cwd`.
- `pi-vim-documentation`: the settings reference documents the config files
  instead of the `piVim` settings object.
- `vim-ui-configuration`, `vim-mode-editor`, `vim-marks`,
  `vim-macro-recording`, `vim-easymotion`, `extended-vim-keybindings`,
  `prompt-native-structure-editing`, `vim-editor-adapter-architecture`:
  option paths drop the `piVim.` prefix. No other behavior changes.

## Impact

- **Code:**
  - `src/config.ts`: loader, paths, source labels, warning paths, and removal
    of the rename warnings;
  - `src/config-js.ts`: JS config path;
  - `src/lifecycle.ts`: passes the trust decision;
  - `src/config-metadata.ts`, `src/customization.ts` and
    `src/runtime-help.ts`: path strings;
  - `scripts/generate-config-reference.ts`.
- **Tests:** `test/config.test.ts`, `test/config-js.test.ts`,
  `test/config-metadata.test.ts`, `test/docs-drift.test.ts`,
  `test/generate-config-reference.test.ts`,
  `test/trusted-config-examples.test.ts`, `test/vim-editor.test.ts` and the
  lifecycle tests.
- **Docs:** `docs/settings.md`, `docs/config.md` (regenerated),
  `docs/features.md`, `README.md` and `CHANGELOG.md`, plus a new ADR that
  amends ADR-0008.
- **Dependencies:** adds the runtime dependency `@graelo/pi-ext-config`
  (`^0.2.0`). Its peer `@earendil-works/pi-coding-agent` is already a peer of
  pi-vim.
- **Compatibility:** breaking for anyone configuring pi-vim through
  `settings.json` or `pi-vim.config.js`. pi-vim has no release yet, so no
  migration path is provided.
