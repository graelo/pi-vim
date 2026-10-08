## Why

The `pi-vim.*` diagnostic action IDs (`pi-vim.doctor`, `pi-vim.keymap`,
`pi-vim.keybindings`, `pi-vim.mapcheck`, `pi-vim.help`, `pi-vim.messages`,
`pi-vim.inspect`) name Ex commands that already exist. They cannot be bound
or dispatched, and Vim has nothing like them. Their only visible effect is
that `:keymap` and `:help` searches return a row such as
`pi-vim.doctor diagnostic command=:vimdoctor metadata-only not bindable`,
which points at the command `:help customization` already describes. The
registry also costs a source module, a metadata source in the config
reference, drift-guard metadata, and spec requirements.

## What Changes

- **BREAKING** (discovery output only): remove the `pi-vim.*` diagnostic
  action IDs. `:keymap` and `:keybindings` searches no longer list them, and
  `:help` no longer falls back to them. `:help diagnostics` shows the
  runtime help entry for the diagnostics category, and `:help vimdoctor`,
  `:help keymap`, and similar topics keep showing the customization entry.
- Remove `src/diagnostic-actions.ts`, the `diagnostic-registry` action
  source, and the `bindable` flag that only that source set to `false`.
- Drop the related docs anchors, docs prose, and drift-guard checks.

Non-goals: no change to the diagnostic Ex commands themselves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-customization-diagnostics`: remove the metadata-only action
  requirements and the popup scenario about them.
- `runtime-help-drift-guard`: remove diagnostic action metadata validation
  and the help-topic classification requirement.
- `pi-vim-documentation`: quickref and drift-metadata requirements no longer
  mention diagnostic action IDs.
- `vim-keymap-configuration`: remove the requirement that kept
  `showKeybindings` separate from the metadata IDs.

## Impact

`src/diagnostic-actions.ts` (deleted), `src/customization.ts`,
`src/runtime-help.ts`, `src/config-metadata.ts`,
`scripts/generate-config-reference.ts`, tests that reference the IDs,
`docs/features.md`, `docs/settings.md`, `CHANGELOG.md`.
