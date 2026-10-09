# Design

## Context

`modalStatus` in `src/modal/view.ts` builds the status string from its items.
The `mode` item comes from `modalModeLabel`, which picks the full or narrow
label by width. `fitStatusBorder` in `src/vim-editor.ts` places the status
inside the editor border, measuring and truncating with pi-tui's
`visibleWidth` and `truncateToWidth`. Only the border dashes go through
`borderColor`; the status text is emitted as is.

A probe confirmed that `truncateToWidth` ignores SGR codes when measuring, and
appends `\x1b[0m` when it cuts a colored string. A truncated colored label
therefore cannot leak its color into the border.

`ui.mode.labels` and `ui.mode.narrowLabels` set the pattern for per-mode
records: JSON layers merge per mode, while trusted JS replaces the whole record
(`JS_REPLACED_RECORD_PATHS`).

## Goals / Non-Goals

**Goals:**

- Color the mode label only, with exact palette-index output for themed
  terminals.
- Keep the change out of the modal engine: pure config plus view.

**Non-Goals:**

- Separator glyphs, named colors, Pi theme integration, coloring other status
  items.

## Decisions

### D1. Color value: palette index or hex string

- Stored type: `VimModeColor = number | \`#${string}\``, and
  `VimModeColors = { bg?: VimModeColor; fg?: VimModeColor }`.
- `ResolvedVimUi["mode"]` gains
    `colors: Partial<Record<VimMode, VimModeColors>>`, which defaults to `{}`.
- Accepted values are integers `0`–`255` and strings matching
  `/^#[0-9a-fA-F]{6}$/`. Hex is lowercased on parse, so output is stable.

*Alternatives:*

- Named colors (`"green"`): rejected. Names map to different palette slots
  across themes, which is the user's stated problem.
- Raw escape strings like `easymotion.labelColor`: rejected. They are hard to
  validate and easy to break the border with.
- 3-digit hex or `rgb()` forms: rejected to keep validation finite.

### D2. SGR output

- A pure helper in `src/modal/view.ts` builds the start sequence: `48;5;n` /
  `38;5;n` for indices, and `48;2;r;g;b` / `38;2;r;g;b` for hex. Background
  and foreground are combined in one `\x1b[…m` sequence.
- The label is wrapped as `<start> LABEL \x1b[0m`.
- An entry with neither `bg` nor `fg` renders as plain text, with no padding.

*Alternative rejected:* pi-tui or chalk color helpers. They do not take
palette indices, and they would add a dependency on terminal color detection.

### D3. Where padding and color apply

- `statusPartsForItem` wraps the label only when the current mode resolves to
  colors. The visual fallback is `colors[mode] ?? colors.visual` for
  `visualLine` and `visualBlock`.
- `modalModeLabel` keeps returning plain text, so label choice and its width
  rule (`width < full.length + 4`) are unchanged.
- The surrounding status padding (` … `) and the `REC` part stay as they are.

### D4. Layering

- **JSON:** `ui.mode.colors` merges per mode across global and project config,
  the same way as `labels`. Each mode's entry replaces that mode's previous
  entry as a whole, so `bg` and `fg` travel together.
- **Trusted JS:** `ui.mode.colors` joins `TRUSTED_JS_OPTION_PATHS`,
  `PROPERTY_FACTS` (accepted shape and "replaces whole record") and
  `JS_REPLACED_RECORD_PATHS`.
- **Live editor:** `cloneUi` deep-copies the record so the editor gets
  isolated options.

### D5. Validation

`parseUiMode` gains a colors parser:

- a non-object `colors` value warns
  `<source>: ui.mode.colors must be an object`;
- an unknown mode key warns `<source>: unsupported ui.mode.colors.<key>`;
- a non-object entry warns `<source>: ui.mode.colors.<mode> must be an object`;
- a bad color warns `<source>: ui.mode.colors.<mode>.<bg|fg> must be a palette
  index 0-255 or "#rrggbb"`;
- unknown keys inside an entry are ignored with a warning.

A valid sibling `bg` or `fg` survives a bad neighbor.

## Risks / Trade-offs

- **Terminals without 24-bit color show approximate hex colors.** →
  Recommend palette indices in the docs. The user's case uses indices.
- **Very narrow widths cut the padded block.** → Truncation resets color (see
  Context). A live `VimEditor` test covers a narrow width.
- **Another option family to propagate.** → Update `cloneUi` and add the
  live-editor reconfigure test the project rules ask for.

## Migration Plan

Additive and off by default. No migration.
