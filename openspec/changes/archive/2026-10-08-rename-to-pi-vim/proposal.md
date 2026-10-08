## Why

The fork kept upstream's name, pi-vimmode, which is long and does not tell the
two projects apart outside npm. ADR-0008 renames it to pi-vim.

## What Changes

- **BREAKING** Package `@graelo/pi-vim`; settings key `piVim`; JS config file
  `~/.pi/agent/pi-vim.config.js`; `/vim` command; `:vim inspect`; diagnostic
  IDs `pi-vim.*`.
- The old settings key and config file are ignored with a "renamed in 1.0.0"
  warning.
- Durable specs are renamed in place, including the
  `pi-vimmode-documentation` capability, now `pi-vim-documentation`. Archived
  changes keep the old name.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-customization-diagnostics`: warns about pre-rename configuration.
- All specs: identifiers renamed in place, with no other requirement change.

## Impact

- Code: `src/config.ts`, `src/config-js.ts`, `src/lifecycle.ts`, `src/ex.ts`,
  `src/diagnostic-actions.ts`, `src/runtime-help.ts`, and every module that
  names the settings key.
- Docs: README, `docs/*.md`, `AGENTS.md`, `CHANGELOG.md`, examples.
