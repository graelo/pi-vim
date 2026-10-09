# Spec Delta

## ADDED Requirements

### Requirement: Mode label colors are configurable

The Vim editor SHALL support optional per-mode background and foreground
colors for the mode label through `ui.mode.colors`. Each color SHALL be either
a 256-color palette index (an integer from `0` to `255`) or a `"#rrggbb"` hex
string. With no colors configured for the current mode, the mode label SHALL
render as plain text.

#### Scenario: Palette index colors render

- **WHEN** `ui.mode.colors.normal` is `{ "bg": 2, "fg": 15 }` and the editor
    is in normal mode
- **THEN** the mode label renders as ` NORMAL ` with palette background `2`
    and palette foreground `15`, and the color ends right after the label

#### Scenario: Hex colors render

- **WHEN** `ui.mode.colors.insert` is `{ "bg": "#268bd2" }` and the editor is
    in insert mode
- **THEN** the mode label renders as ` INSERT ` on a 24-bit `#268bd2`
    background with the terminal's default foreground

#### Scenario: Narrow label is colored too

- **WHEN** colors are configured for the current mode and the width selects
    the narrow label
- **THEN** the narrow label renders with the same colors and padding

#### Scenario: Visual line and block inherit visual colors

- **WHEN** `ui.mode.colors.visual` is set and `ui.mode.colors.visualLine` is
    not
- **THEN** visual line mode renders its label with the `visual` colors
- **AND** a `visualLine` or `visualBlock` entry, when set, takes precedence

#### Scenario: Colors are off by default

- **WHEN** `ui.mode.colors` is not configured
- **THEN** the mode label renders exactly as plain text, with no color codes
    and no added padding

#### Scenario: Invalid colors fall back per field

- **WHEN** a `ui.mode.colors` entry names an unknown mode, is not an object,
    or holds a color that is neither an integer from `0` to `255` nor a
    6-digit `#rrggbb` string
- **THEN** a warning is recorded, that entry or color is ignored, and valid
    sibling colors and other UI settings still apply

#### Scenario: Colored label stays width-safe

- **WHEN** a colored mode label is truncated because the status group does
    not fit the width
- **THEN** the rendered border never exceeds the provided width and no color
    continues past the label into the border

#### Scenario: Trusted JS sets mode colors

- **WHEN** the trusted JS config assigns
    `vim.ui.mode.colors = { normal: { bg: 2, fg: 15 } }`
- **THEN** the resolved options use those colors, replacing the whole
    colors record rather than merging keys
