# Proposal

## Why

The mode label in the editor border is plain text, so the current mode is easy
to miss at a glance. A colored block per mode, like Vim statusline plugins
draw, makes the mode readable from the corner of the eye. Users with a themed
terminal palette (for example Solarized) need the colors to follow that palette
by index rather than by fixed RGB values.

## What Changes

- New optional setting `ui.mode.colors`: a partial record of Vim modes to
  `{ "bg": <color>, "fg": <color> }`, where each color is either a 256-color
  palette index (integer `0`–`255`) or a `"#rrggbb"` hex string. Both keys
  are optional.
- When the current mode has colors, the mode label renders as a colored block
  with one space of padding on each side, for example ` NORMAL `, inside the
  editor border. The narrow label gets the same treatment.
- `visualLine` and `visualBlock` use the `visual` colors unless they have their
  own entry.
- Off by default: with no `ui.mode.colors`, the label renders exactly as today.
- Invalid entries (unknown mode, non-object, color that is neither an integer
  `0`–`255` nor a 6-digit hex string) warn and are ignored per field; valid
  siblings still apply.
- Trusted JS config exposes the same option as `vim.ui.mode.colors`, replacing
  the whole record like `vim.ui.mode.labels`.

## Non-goals

- No Powerline or Nerd Font separator glyphs.
- No colors for other status items (pending operator, selection, cursor
  position, `REC`).
- No named colors, and no use of Pi theme colors.
- No change to mode label text, narrow-label selection, or status layout
  widths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vim-ui-configuration`: adds a requirement for configurable mode label
  colors.

## Impact

- **Code:**
  - `src/types.ts`: the `ResolvedVimUi` mode colors type;
  - `src/config/`: defaults, parser, merge and clone;
  - `src/config-property-paths.ts`, `src/config-metadata.ts` and
    `src/config/js-layer.ts`: the trusted JS option path;
  - `src/modal/view.ts`: produces the colored label;
  - `src/vim-editor.ts`: border rendering stays width-safe.
- **Tests:** config parsing and warnings, view/status rendering, a live
  `VimEditor` border test, and the trusted JS path.
- **Docs:** `docs/settings.md` (UI mode settings with a Solarized example),
  `docs/config.md` (regenerated), `docs/features.md` (status UI mention) and a
  CHANGELOG `[Unreleased]` entry.
- **Dependencies:** none.
- **Compatibility:** additive and off by default, so not breaking.
