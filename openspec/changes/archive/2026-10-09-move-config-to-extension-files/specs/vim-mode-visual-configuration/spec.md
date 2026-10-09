# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Settings are namespaced and read-only`
- TO: `### Requirement: Settings are read from pi-vim config files`

## MODIFIED Requirements

### Requirement: Startup mode is configurable

The Vim editor SHALL support a settings-driven startup mode for newly created
prompt editors.

#### Scenario: Default startup mode

- **WHEN** no `startMode` setting is configured
- **THEN** new Vim editor instances start in insert mode

#### Scenario: Normal startup mode configured

- **WHEN** `startMode` is set to `normal` in the active pi-vim config
- **THEN** new Vim editor instances start in normal mode

#### Scenario: Project startup mode overrides global startup mode

- **WHEN** global config and project config both define
    `startMode`
- **THEN** the project setting determines the startup mode for sessions in
    that project

#### Scenario: Invalid startup mode setting

- **WHEN** `startMode` is missing or set to an unsupported value
- **THEN** the Vim editor falls back to insert mode and does not fail session
    startup

### Requirement: Cursor style is configurable per Vim mode

The Vim editor SHALL support settings-driven cursor styles for insert, normal,
characterwise visual, and visual line modes.

#### Scenario: Default cursor styles

- **WHEN** no `cursor` setting is configured
- **THEN** insert mode uses a bar cursor and normal, visual, and visual line
    modes use block cursors

#### Scenario: Per-mode cursor style configured

- **WHEN** `cursor.<mode>` is set to `block`, `bar`, or `underline`
- **THEN** the Vim editor renders that cursor style whenever the corresponding
    mode is active

#### Scenario: Bar cursor preserves current character

- **WHEN** the active cursor style is `bar` and the cursor is positioned over
    a non-empty character cell
- **THEN** the rendered cursor cell includes the underlying character, applies
    bar cursor styling, and remains one visible cell wide

#### Scenario: Bar cursor handles empty cursor cells

- **WHEN** the active cursor style is `bar` and the cursor is positioned at
    the end of a line or another empty cursor cell
- **THEN** the Vim editor renders a visible one-cell bar cursor placeholder
    without hiding adjacent text

#### Scenario: Cursor style updates on mode transition

- **WHEN** the editor changes between insert, normal, visual, and visual line
    modes
- **THEN** the rendered cursor style updates to match the active mode
    configuration

#### Scenario: Invalid cursor style setting

- **WHEN** a cursor style setting is missing or unsupported
- **THEN** the Vim editor uses the default cursor style for that mode and does
    not fail session startup

### Requirement: Settings are read from pi-vim config files

The Vim editor SHALL read its options from a global
`<agent-dir>/extensions/pi-vim/config.json`, where `<agent-dir>` is Pi's agent
directory (honoring `PI_CODING_AGENT_DIR`), and from a project
`<repo-root>/.pi/extensions/pi-vim/config.json` when Pi trusts the project.
Each file holds the options object at its top level. The extension SHALL NOT
read or modify Pi `settings.json` files.

#### Scenario: Namespaced settings loaded

- **WHEN** Pi starts a session and `<agent-dir>/extensions/pi-vim/config.json`
    contains `{ "startMode": "normal" }` plus keys that are not pi-vim options
- **THEN** new Vim editor instances start in normal mode, and the extension
    reads only supported fields and ignores the others

#### Scenario: Agent directory override honored

- **WHEN** `PI_CODING_AGENT_DIR` points at a custom agent directory that holds
    `extensions/pi-vim/config.json`
- **THEN** the extension reads the global config from that directory, not
    from `~/.pi/agent`

#### Scenario: Trusted project config loaded

- **WHEN** the session `cwd` is inside a git repository, Pi trusts the project,
    and `<repo-root>/.pi/extensions/pi-vim/config.json` exists
- **THEN** the extension applies that file as the project config

#### Scenario: Untrusted project config ignored

- **WHEN** Pi does not trust the project
- **THEN** the extension ignores the project config file and applies only the
    global config and the trusted JS config

#### Scenario: No repository means no project config

- **WHEN** the session `cwd` is not inside a git repository
- **THEN** the extension reads no project config, even if
    `<cwd>/.pi/extensions/pi-vim/config.json` exists

#### Scenario: Pi settings files are ignored

- **WHEN** Pi's global or project `settings.json` contains a `piVim` key
- **THEN** the extension ignores it, reports no warning about it, and does not
    modify the file

#### Scenario: Project settings override global settings

- **WHEN** global config and project config both define supported fields
- **THEN** project config overrides global config field by field without
    discarding unrelated global fields

#### Scenario: Settings file unavailable or invalid

- **WHEN** a config file is absent, unreadable, or contains invalid JSON or a
    non-object value
- **THEN** the extension skips that file, records a warning for an existing
    file it could not use, uses the remaining layers or defaults, and keeps the
    prompt editor usable

#### Scenario: Invalid nested setting falls back

- **WHEN** a nested field such as `cursor`, `keymap`, or `ui`
    contains an unsupported value
- **THEN** the invalid field falls back to its default or lower-precedence
    value, a warning is recorded, and sibling settings remain usable

### Requirement: New visual and configuration behavior is documented and tested

The change SHALL include tests and documentation for visual highlighting, visual
line mode, startup mode settings, and per-mode cursor styles.

#### Scenario: Automated validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover visual highlight range mapping, visual line operations,
    config parsing/defaults, and mode-specific cursor rendering

#### Scenario: Typecheck runs

- **WHEN** `npm run check` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Canonical docs document visual settings and keymap

- **WHEN** the user opens `docs/features.md` and `docs/settings.md`
- **THEN** they document `V`, visual line operations, visual selection
    highlighting, `startMode`, and `cursor` settings

### Requirement: Visual block mode selects rectangular text regions

The Vim editor SHALL support a visual block mode that selects a rectangular
region bounded by the visual anchor and cursor across prompt lines.

#### Scenario: Enter visual block mode with configured command binding

- **WHEN** `keymap.commands.visualBlock` maps a key sequence and the
    editor receives that sequence in normal mode
- **THEN** the editor enters visual block mode with the visual anchor at the
    current cursor position

#### Scenario: Block selection covers rectangular cells

- **WHEN** the editor is in visual block mode and the user moves the cursor to
    another line and column
- **THEN** the active selection covers only cells whose line is between the
    anchor and cursor lines and whose column is between the anchor and cursor
    columns

#### Scenario: Block selection handles ragged lines

- **WHEN** a visual block selection spans lines shorter than the selected
    columns
- **THEN** operations treat missing cells as empty slices and MUST NOT throw
    or move the cursor outside the prompt text

#### Scenario: Cancel visual block mode

- **WHEN** the editor is in visual block mode and the user presses `Escape`
- **THEN** visual selection clears and the editor returns to normal mode
    without changing prompt text

### Requirement: Visual modes can switch to block selection

The Vim editor SHALL allow switching between characterwise, linewise, and
blockwise visual modes while preserving the current visual anchor.

#### Scenario: Switch from characterwise visual to visual block

- **WHEN** `keymap.commands.visualBlock` maps a key sequence and the
    editor receives that sequence in characterwise visual mode
- **THEN** the editor switches to visual block mode, keeps the existing visual
    anchor, and keeps the current cursor position

#### Scenario: Switch from visual line to visual block

- **WHEN** `keymap.commands.visualBlock` maps a key sequence and the
    editor receives that sequence in visual line mode
- **THEN** the editor switches to visual block mode, keeps the existing visual
    anchor, and keeps the current cursor position

#### Scenario: Enter visual block mode with configured command binding

- **WHEN** `keymap.commands.visualBlock` maps a printable key
    sequence or Vim-style modifier sequence such as `<C-v>` / `<A-x>` and the
    editor receives that sequence in normal or visual mode
- **THEN** the editor enters or switches to visual block mode while preserving
    any existing visual anchor

#### Scenario: Switch from visual block to characterwise visual

- **WHEN** the editor is in visual block mode and the user presses `v`
- **THEN** the editor switches to characterwise visual mode, keeps the
    existing visual anchor, and keeps the current cursor position

#### Scenario: Switch from visual block to visual line

- **WHEN** the editor is in visual block mode and the user presses `V`
- **THEN** the editor switches to visual line mode, keeps the existing visual
    anchor, and keeps the current cursor position
