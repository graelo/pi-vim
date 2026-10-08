## Why

pi-vimmode set a Pi footer status (`vim`, `vim ⚠`, `vim off`). Pi renders it
on its own footer line, so it costs a terminal row to repeat what the editor's
mode label already shows.

## What Changes

- **BREAKING** The lifecycle no longer calls `setStatus`, so the footer line is
  gone.
- When retained settings warnings change and are non-empty, the lifecycle shows
  one warning notification with the count and a pointer to `:vimdoctor`.
- Update user docs accordingly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-extension-lifecycle`: the settings-refresh requirement drops the footer
  status and adds the warning notification; other requirements drop "status".
- `pi-vimmode-documentation`: the troubleshooting scenario starts from the
  warning notification instead of `vim ⚠`.

## Impact

- Code: `src/lifecycle.ts`, `test/lifecycle.test.ts`.
- Docs: `docs/features.md`, `docs/settings.md`, `CHANGELOG.md`.
