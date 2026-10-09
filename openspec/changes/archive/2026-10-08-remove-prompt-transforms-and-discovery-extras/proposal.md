## Why

The fork narrows pi-vimmode to Vim-style prompt editing. Prompt transforms
(`:quote`, `:unquote`, `:bulletize`, `:fence`, `:indent`, `:dedent`, `:reflow`)
and the action-keybinding layer built for them added a second, non-Vim editing
vocabulary with its own registry, recipes, presets, and settings. `:features`
duplicated `:help`, `:keybindings`, `:actions`, and `:mapcheck`, and
`:changelog` shipped release notes into the editor, which nobody needs at the
prompt.

## What Changes

- **BREAKING** Remove the prompt transform Ex commands and the
  `prompt.transform.*` actions, including `vim.prompt.quote()` and the other
  transform factories in trusted JavaScript config.
- **BREAKING** Remove `piVimMode.keymap.actions`,
  `piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms`. They now
  produce a "removed in 1.0.0" warning and are ignored; valid siblings still
  apply.
- **BREAKING** Remove `:features` (and its `vimmode.features` metadata) and
  `:changelog`, including the Markdown popup renderer that only `:changelog`
  used.
- Keep Vim line shifts (`>>`, `<<`, visual `>`/`<`), which previously reused the
  transform engine, as plain two-space indent/dedent.
- Update user docs, examples, and OpenSpec requirements accordingly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `prompt-transform-action-keybindings`: retired; every requirement removed.
- `vim-keymap-configuration`: action keymap, presets, and mode-scoped action
  requirements removed; removed settings warn; JS builder examples use
  `vim.action.*` descriptors.
- `vim-ex-command-line`: transform and `:features` commands removed; removed
  commands are explicitly unsupported.
- `runtime-help-drift-guard`: feature matrix, recipe/preset discovery, and
  transform registry drift checks removed.
- `vim-customization-diagnostics`: feature discovery and transform diagnostics
  removed; catalogs no longer list prompt transforms.
- `prompt-native-structure-editing`: Ex transforms and transform keybindings
  removed; structure text objects unchanged.
- `pi-vimmode-documentation`, `vim-runtime-inspectability`,
  `vim-ui-configuration`, `vim-editor-adapter-architecture`,
  `extended-vim-keybindings`, `prompt-range-algebra`: references to the removed
  surfaces dropped; behavior otherwise unchanged.

## Impact

- Code: `src/config.ts`, `src/config-js.ts`, `src/commands.ts`, `src/ex.ts`,
  `src/buffer.ts`, `src/customization.ts`, `src/runtime-help.ts`,
  `src/keybinding-discovery-popup.ts`, `src/modal/*`; deleted
  `src/prompt-transform-actions.ts`, `src/action-keybinding-recipes.ts`,
  `src/release-notes.ts`, `src/markdown-popup.ts`, `src/modal/actions.ts`.
- Public types: `@graelo/pi-vimmode/config` drops transform factories,
  `keymap.actionPresets`, and `promptTransforms`.
- Docs: `docs/features.md`, `docs/settings.md`, generated `docs/config.md`,
  examples.
- No new runtime dependencies.

## Non-goals

- Replacing transforms with another formatting feature.
- Changing `:help`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`,
  `:messages`, `:vimmode inspect`, or `:vimdoctor` behavior.
