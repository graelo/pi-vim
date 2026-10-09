## Why

Two leftovers from upstream behave in surprising ways for a Vim user. `:s`
needed two `Enter` presses: the first only highlighted matches and the second
applied them, which differs from Vim. `:actions` duplicated `:keymap <query>`
and `:keybindings <query>` once prompt transforms were gone.

## What Changes

- **BREAKING** `Enter` applies a substitution immediately, as in Vim. The
  confirm-preview step, its highlights, and its "Enter applies, Esc cancels"
  message are removed. `:&`, `:&&`, and `:%&` apply immediately too. The `n`
  flag still counts matches without editing.
- **BREAKING** Remove `:actions` and its `vimmode.actions` metadata. `:keymap
  <query>` searches actions and their bindings, including `vimmode.*`
  diagnostic metadata.
- Update user docs accordingly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-ex-command-line`: substitution applies on `Enter`; requirements that
  described the preview are replaced; `:actions` removed from the diagnostic
  command set and listed as unsupported.
- `vim-ui-configuration`: workbench no longer renders substitution previews.
- `vim-customization-diagnostics`: action search requirement removed;
  diagnostic metadata is searched through `:keymap`.
- `pi-vimmode-documentation`, `runtime-help-drift-guard`,
  `vim-runtime-inspectability`, `vim-editor-adapter-architecture`: references
  to `:actions` and the preview dropped.

## Impact

- Code: `src/modal/ex-command-line.ts`, `src/modal/types.ts`,
  `src/modal/workbench.ts`, `src/modal/inspect.ts`, `src/vim-editor.ts`,
  `src/ex.ts`, `src/customization.ts`, `src/diagnostic-actions.ts`,
  `src/runtime-help.ts`, `src/keybinding-discovery-popup.ts`,
  `src/read-only-popup.ts`.
- Docs: `docs/features.md`, `docs/settings.md`, `CHANGELOG.md`.
